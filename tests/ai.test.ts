import { describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createDeepSeek, aiConfig, type AiConfig } from '../server/deepseek';
import { createAiHandler } from '../server/handler';
import { isAiSuggestion } from '../src/lib/ai';
import { createInitialState, isAppState, validatePhotoRoute } from '../src/lib';

const config: AiConfig = {
  apiKey: 'test-only-secret',
  baseUrl: 'https://api.example.test/v1',
  model: 'vision-model',
};
const input = { image: 'data:image/jpeg;base64,/9j/AA==', focus: 'balance' };
const output = {
  suitable: true,
  name: '平衡候选',
  summary: '低位构思，需要现场核对。',
  holds: [
    { x: 30, y: 85, role: 'start', instruction: '先核对起点。' },
    { x: 48, y: 55, role: 'foot', instruction: '观察重心与脚点。' },
    { x: 60, y: 18, role: 'finish', instruction: '核对终点。' },
  ],
  limitations: ['无法判断墙面倾角。'],
};
const completion = (content: unknown = output, finish = 'stop') =>
  Response.json({
    choices: [{ finish_reason: finish, message: { content: JSON.stringify(content) } }],
  });
const fakeFetch = (callback: (url: string, init?: RequestInit) => Response | Promise<Response>) =>
  ((url, init) => Promise.resolve(callback(String(url), init))) as typeof fetch;

describe('DeepSeek 服务端协议与数据边界', () => {
  it('连接检查验证实际模型调用，不把公开模型目录当作鉴权成功', async () => {
    const service = createDeepSeek(
      config,
      fakeFetch((url, init) => {
        expect(url).toBe(config.baseUrl + '/chat/completions');
        expect(init?.method).toBe('POST');
        const body = JSON.parse(String(init?.body));
        expect(body.model).toBe(config.model);
        expect(body.max_tokens).toBeLessThanOrEqual(16);
        expect(body.messages).toEqual([{ role: 'user', content: 'Reply with only OK.' }]);
        return Response.json({ choices: [{ message: { content: 'OK' } }] });
      }),
    );
    expect((await service.check()).status).toBe('verified');
    const publicCatalog = createDeepSeek(
      config,
      fakeFetch(() => Response.json({ data: [{ id: config.model }] })),
    );
    await expect(publicCatalog.check()).rejects.toMatchObject({ code: 'invalid_check' });
    expect(publicCatalog.status().status).toBe('unavailable');
    const denied = createDeepSeek(
      config,
      fakeFetch(() => new Response('', { status: 401 })),
    );
    await expect(denied.check()).rejects.toMatchObject({ code: 'auth_error' });
    expect(denied.status().status).toBe('auth-error');
  });
  it('真实协议包含图片和目标；密钥只在服务端请求头，返回只包含已验证字段', async () => {
    const service = createDeepSeek(
      config,
      fakeFetch((url, init) => {
        expect(url).toBe('https://api.example.test/v1/chat/completions');
        expect((init?.headers as Record<string, string>).Authorization).toBe(
          'Bearer test-only-secret',
        );
        const sent = JSON.parse(String(init?.body));
        expect(sent.model).toBe('vision-model');
        expect(sent.response_format.type).toBe('json_object');
        expect(sent.messages[1].content[1].image_url.url).toBe(input.image);
        expect(sent.messages[1].content[0].text).toContain('平衡控制');
        return completion({ ...output, apiKey: 'do-not-forward' });
      }),
    );
    const result = await service.generate(input);
    expect(isAiSuggestion(result)).toBe(true);
    expect(result).not.toHaveProperty('apiKey');
    expect(JSON.stringify(result)).not.toContain(config.apiKey);
    expect(service.status().status).toBe('verified');
    const state = createInitialState();
    state.photoRoutes = [
      {
        id: 'ai-route',
        ownerId: state.user.id,
        name: result.name,
        location: '',
        image: input.image,
        holds: result.holds.map((hold, index) => ({ ...hold, id: String(index) })),
        focus: 'balance',
        notes: '',
        favorite: false,
        source: 'deepseek',
        ai: result,
        createdAt: result.generatedAt,
        updatedAt: result.generatedAt,
      },
    ];
    expect(validatePhotoRoute(state.photoRoutes[0])).toEqual({});
    expect(isAppState(state)).toBe(true);
    state.photoRoutes[0].holds[0].x = 40;
    expect(validatePhotoRoute(state.photoRoutes[0])).toHaveProperty('ai');
  });
  it('拒绝缺失图片、非 JPEG 字节和未知训练目标，且不调用上游', async () => {
    let calls = 0;
    const service = createDeepSeek(
      config,
      fakeFetch(() => {
        calls++;
        return completion();
      }),
    );
    await expect(service.generate({ ...input, focus: '__proto__' })).rejects.toMatchObject({
      code: 'invalid_input',
    });
    await expect(
      service.generate({ ...input, image: 'data:image/jpeg;base64,YQ==' }),
    ).rejects.toMatchObject({ code: 'invalid_image' });
    await expect(service.generate({})).rejects.toMatchObject({ code: 'invalid_input' });
    expect(calls).toBe(0);
  });
  it('区分鉴权、余额、频率与网络错误，绝不返回服务商原始错误内容', async () => {
    for (const [status, code] of [
      [401, 'auth_error'],
      [402, 'insufficient_balance'],
      [429, 'provider_rate_limit'],
      [400, 'model_error'],
      [500, 'provider_error'],
    ] as const) {
      const service = createDeepSeek(
        config,
        fakeFetch(() => new Response('test-only-secret', { status })),
      );
      try {
        await service.generate(input);
        throw new Error('Expected error');
      } catch (issue) {
        expect(issue).toMatchObject({ code });
        expect(String(issue)).not.toContain(config.apiKey);
      }
      if (status === 401) expect(service.status().status).toBe('auth-error');
    }
    const timed = createDeepSeek(
      config,
      fakeFetch(() => {
        throw new DOMException('timeout', 'TimeoutError');
      }),
    );
    await expect(timed.generate(input)).rejects.toMatchObject({ code: 'timeout' });
    const controller = new AbortController();
    controller.abort();
    await expect(timed.generate(input, controller.signal)).rejects.toMatchObject({
      code: 'cancelled',
    });
  });
  it('无法识别、不完整 JSON、越界坐标和伪造岩点均不作为结果返回', async () => {
    const bad = [
      { body: { suitable: false, reason: '不是岩壁' }, code: 'unsuitable_image' },
      {
        body: { ...output, holds: output.holds.map((hold) => ({ ...hold, x: 200 })) },
        code: 'invalid_output',
      },
      {
        body: { ...output, holds: [output.holds[0], output.holds[0], output.holds[2]] },
        code: 'invalid_output',
      },
      { body: { ...output, holds: [] }, code: 'invalid_output' },
    ];
    for (const sample of bad) {
      const service = createDeepSeek(
        config,
        fakeFetch(() => completion(sample.body)),
      );
      await expect(service.generate(input)).rejects.toMatchObject({ code: sample.code });
    }
    const truncated = createDeepSeek(
      config,
      fakeFetch(() => completion(output, 'length')),
    );
    await expect(truncated.generate(input)).rejects.toMatchObject({ code: 'incomplete_output' });
  });
  it('未配置时不发请求；自定义中转地址保留 v1 路径且禁止 URL 中夹带凭据', async () => {
    const service = createDeepSeek(
      { ...config, apiKey: '' },
      fakeFetch(() => {
        throw new Error('Should not call');
      }),
    );
    expect(service.status().status).toBe('unconfigured');
    await expect(service.generate(input)).rejects.toMatchObject({ code: 'not_configured' });
    const disabled = createDeepSeek(
      { ...config, enabled: false },
      fakeFetch(() => {
        throw new Error('Should not call');
      }),
    );
    expect(disabled.status().message).toContain('中转接口地址');
    await expect(disabled.generate(input)).rejects.toMatchObject({ code: 'not_configured' });
    expect(aiConfig({ DEEPSEEK_BASE_URL: config.baseUrl + '/' }).baseUrl).toBe(config.baseUrl);
    expect(aiConfig({}).model).toBe('deepseek-flash');
    expect(() => aiConfig({ DEEPSEEK_BASE_URL: 'https://key:password@example.test' })).toThrow();
  });
});

describe('本地 AI HTTP 接口', () => {
  it('状态不泄露配置秘密，校验来源/格式/大小，限制付费请求次数', async () => {
    const handler = createAiHandler(
      config,
      fakeFetch((url) => (url.endsWith('/models') ? Response.json({ data: [] }) : completion())),
    );
    const server = createServer((request, response) => {
      void handler(request, response).then((handled) => {
        if (!handled) response.writeHead(404).end();
      });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const post = (path: string, body: unknown = input, headers: Record<string, string> = {}) =>
      fetch(base + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: typeof body === 'string' ? body : JSON.stringify(body),
      });
    try {
      const status = await (await fetch(base + '/api/ai/status')).json();
      expect(status).toMatchObject({ status: 'configured', model: config.model });
      expect(JSON.stringify(status)).not.toContain(config.apiKey);
      expect(
        (await post('/api/ai/photo-route', input, { Origin: 'https://another-site.test' })).status,
      ).toBe(403);
      expect((await post('/api/ai/photo-route', input, { Origin: 'not-a-url' })).status).toBe(403);
      expect(
        (await post('/api/ai/photo-route', input, { 'Content-Type': 'text/plain' })).status,
      ).toBe(415);
      expect((await post('/api/ai/photo-route', 'not JSON')).status).toBe(400);
      expect((await post('/api/ai/photo-route', 'x'.repeat(3 * 1024 * 1024 + 1))).status).toBe(413);
      for (let index = 0; index < 6; index++)
        expect((await post('/api/ai/photo-route')).status).toBe(200);
      expect((await post('/api/ai/photo-route')).status).toBe(429);
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});

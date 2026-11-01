import type { IncomingMessage, ServerResponse } from 'node:http';
import { AiError, createDeepSeek, type AiConfig } from './deepseek.ts';

const BODY_LIMIT = 3 * 1024 * 1024;
function readJson(request: IncomingMessage): Promise<unknown> {
  if (Number(request.headers['content-length']) > BODY_LIMIT)
    return Promise.reject(new AiError(413, 'too_large', '请求图片过大，请压缩后重试'));
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let failed = false;
    request.on('data', (chunk: Buffer) => {
      if (failed) return;
      size += chunk.length;
      if (size > BODY_LIMIT) {
        failed = true;
        chunks.length = 0;
        reject(new AiError(413, 'too_large', '请求图片过大，请压缩后重试'));
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => {
      if (failed) return;
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new AiError(400, 'invalid_json', '请求格式无效，请重试'));
      }
    });
    request.on('error', () => reject(new AiError(400, 'request_error', '请求中断，请重试')));
    request.on('aborted', () => reject(new AiError(499, 'cancelled', '请求已取消')));
  });
}
export function createAiHandler(config: AiConfig, fetcher: typeof fetch = fetch) {
  const service = createDeepSeek(config, fetcher);
  // Single-user local server: bound concurrent work and paid requests.
  let active = 0;
  let calls: number[] = [];
  return async function handle(
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<boolean> {
    const path = request.url?.split('?')[0] || '';
    if (!path.startsWith('/api/ai/')) return false;
    const send = (status: number, body: unknown) => {
      if (response.destroyed || response.writableEnded) return;
      response.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      response.end(JSON.stringify(body));
    };
    const controller = new AbortController();
    const onClose = () => {
      if (!response.writableEnded) controller.abort();
    };
    response.on('close', onClose);
    let acquired = false;
    try {
      const origin = request.headers.origin;
      let sameOrigin = true;
      try {
        sameOrigin = !origin || new URL(origin).host === request.headers.host;
      } catch {
        sameOrigin = false;
      }
      if (request.headers['sec-fetch-site'] === 'cross-site' || !sameOrigin)
        throw new AiError(403, 'origin_denied', '仅允许同一应用来源访问 AI 接口');
      if (path === '/api/ai/status' && request.method === 'GET') {
        send(200, service.status());
        return true;
      }
      if (!['/api/ai/check', '/api/ai/photo-route'].includes(path))
        throw new AiError(404, 'not_found', '接口不存在');
      if (request.method !== 'POST')
        throw new AiError(405, 'method_not_allowed', '请使用 POST 请求');
      if (!request.headers['content-type']?.toLowerCase().startsWith('application/json'))
        throw new AiError(415, 'content_type', '请发送 JSON 请求');
      calls = calls.filter((time) => time > Date.now() - 60_000);
      if (active >= 2 || calls.length >= 6)
        throw new AiError(429, 'local_rate_limit', '请求较频繁，请稍等一分钟后重试');
      const input = await readJson(request);
      // Re-check after reading the body so simultaneous uploads cannot bypass the cap.
      if (active >= 2 || calls.length >= 6)
        throw new AiError(429, 'local_rate_limit', '请求较频繁，请稍等一分钟后重试');
      active++;
      acquired = true;
      calls.push(Date.now());
      const result =
        path === '/api/ai/check'
          ? await service.check(controller.signal)
          : await service.generate(input, controller.signal);
      send(200, result);
    } catch (error) {
      const issue =
        error instanceof AiError
          ? error
          : new AiError(500, 'internal_error', 'AI 服务处理失败，请稍后重试');
      send(issue.status, { error: { code: issue.code, message: issue.message } });
    } finally {
      if (acquired) active--;
      response.removeListener('close', onClose);
    }
    return true;
  };
}

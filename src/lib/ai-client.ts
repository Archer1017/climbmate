import {
  isAiSuggestion,
  type AiRouteInput,
  type AiRouteSuggestion,
  type AiServiceStatus,
} from './ai';

export class AiClientError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}
async function api(path: string, input?: unknown, signal?: AbortSignal): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch('/api/ai/' + path, {
      method: input === undefined ? 'GET' : 'POST',
      headers: input === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: input === undefined ? undefined : JSON.stringify(input),
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(75_000)])
        : AbortSignal.timeout(75_000),
    });
  } catch (error) {
    if (signal?.aborted) throw new AiClientError('cancelled', '已取消生成，原有标记已保留');
    if (error instanceof Error && ['AbortError', 'TimeoutError'].includes(error.name))
      throw new AiClientError('timeout', '请求超时，请重试，原有标记已保留');
    throw new AiClientError('network_error', '无法连接 AI 服务，请检查本地服务器是否启动');
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new AiClientError(
      'missing_server',
      '当前地址未提供 AI 接口，请通过 npm run dev 或 npm start 启动项目',
    );
  }
  if (!response.ok) {
    if (
      body &&
      typeof body === 'object' &&
      'error' in body &&
      body.error &&
      typeof body.error === 'object' &&
      'code' in body.error &&
      'message' in body.error &&
      typeof body.error.code === 'string' &&
      typeof body.error.message === 'string'
    )
      throw new AiClientError(body.error.code, body.error.message);
    throw new AiClientError('server_error', 'AI 服务暂时不可用，请稍后重试');
  }
  return body;
}
export async function getAiStatus(check = false, signal?: AbortSignal): Promise<AiServiceStatus> {
  const value = await api(check ? 'check' : 'status', check ? {} : undefined, signal);
  if (
    !value ||
    typeof value !== 'object' ||
    !('status' in value) ||
    !('model' in value) ||
    !('message' in value) ||
    !['unconfigured', 'configured', 'verified', 'auth-error', 'unavailable'].includes(
      String(value.status),
    ) ||
    typeof value.model !== 'string' ||
    typeof value.message !== 'string'
  )
    throw new AiClientError('invalid_status', '无法读取 AI 服务状态');
  return value as AiServiceStatus;
}
export async function generateAiRoute(
  input: AiRouteInput,
  signal: AbortSignal,
): Promise<AiRouteSuggestion> {
  const value = await api('photo-route', input, signal);
  if (!isAiSuggestion(value))
    throw new AiClientError('invalid_output', 'AI 返回格式无法验证，原有标记已保留');
  return value;
}

import { useEffect, useRef, useState } from 'react';
import { Check, LoaderCircle, RefreshCw, Sparkles, X } from 'lucide-react';
import type { AiRouteSuggestion, AiServiceStatus } from '../lib/ai';
import { AiClientError, generateAiRoute, getAiStatus } from '../lib/ai-client';
import { HOLD_LABELS, type PhotoRoute } from '../lib';
import { Button } from './ui';

export function AiRoutePanel({
  image,
  focus,
  hasHolds,
  onApply,
  onBusy,
}: {
  image: string;
  focus: PhotoRoute['focus'];
  hasHolds: boolean;
  onApply: (suggestion: AiRouteSuggestion) => void;
  onBusy: (busy: boolean) => void;
}) {
  const [status, setStatus] = useState<AiServiceStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [suggestion, setSuggestion] = useState<AiRouteSuggestion | null>(null);
  const request = useRef<AbortController | null>(null);
  const statusRequest = useRef<AbortController | null>(null);
  const latestBusy = useRef(onBusy);
  latestBusy.current = onBusy;
  useEffect(() => {
    const controller = new AbortController();
    statusRequest.current = controller;
    void getAiStatus(false, controller.signal)
      .then(setStatus)
      .catch(() => {});
    return () => {
      controller.abort();
      request.current?.abort();
      latestBusy.current(false);
    };
  }, []);
  // A different photo or target must never receive an earlier photo's result.
  useEffect(() => {
    request.current?.abort();
    request.current = null;
    setBusy(false);
    latestBusy.current(false);
    setSuggestion(null);
    setError('');
  }, [image, focus]);
  async function check() {
    statusRequest.current?.abort();
    const controller = new AbortController();
    statusRequest.current = controller;
    setChecking(true);
    setError('');
    try {
      setStatus(await getAiStatus(true, controller.signal));
    } catch (issue) {
      if (!controller.signal.aborted) {
        setError(issue instanceof Error ? issue.message : '连接检查失败');
        void getAiStatus()
          .then(setStatus)
          .catch(() => {});
      }
    } finally {
      if (!controller.signal.aborted) setChecking(false);
    }
  }
  async function generate() {
    statusRequest.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    onBusy(true);
    setError('');
    setSuggestion(null);
    try {
      const result = await generateAiRoute({ image, focus }, controller.signal);
      if (request.current !== controller || controller.signal.aborted) return;
      setSuggestion(result);
      setStatus({ status: 'verified', model: result.model, message: '图片分析请求已成功返回' });
    } catch (issue) {
      if (request.current !== controller) return;
      setError(issue instanceof Error ? issue.message : '生成失败，请重试');
      if (!(issue instanceof AiClientError && issue.code === 'cancelled'))
        void getAiStatus()
          .then(setStatus)
          .catch(() => {});
    } finally {
      if (request.current === controller) {
        setBusy(false);
        onBusy(false);
        request.current = null;
      }
    }
  }
  const unavailable = status?.status === 'unconfigured';
  return (
    <section className="ai-route-panel" aria-labelledby="ai-route-title" aria-busy={busy}>
      <div className="ai-panel-heading">
        <h3 id="ai-route-title">
          <Sparkles size={17} />
          DeepSeek 路线助手
        </h3>
        <Button
          type="button"
          variant="ghost"
          disabled={checking || busy}
          onClick={() => void check()}
        >
          {checking ? (
            <LoaderCircle size={14} className="photo-spinner" />
          ) : (
            <RefreshCw size={14} />
          )}
          检查连接
        </Button>
      </div>
      <p className="ai-status-text" role="status">
        {status?.message || '正在读取 AI 服务配置…'}
      </p>
      <p className="ai-upload-notice">
        点击生成会将这张压缩照片与训练目标发送至配置的 DeepSeek 服务商，可能产生 API
        费用。建议仅拍摄墙面，避免包含人脸等个人信息。
        检查连接仅发送简短文本请求，也会计入服务商用量。
      </p>
      <div className="ai-generate-actions">
        <Button
          type="button"
          disabled={busy || checking || unavailable}
          onClick={() => void generate()}
        >
          {busy ? <LoaderCircle size={16} className="photo-spinner" /> : <Sparkles size={16} />}
          {busy ? '正在识别岩点与构思路线…' : suggestion ? '重新生成建议' : 'AI 识别并生成路线'}
        </Button>
        {busy && (
          <Button type="button" variant="secondary" onClick={() => request.current?.abort()}>
            <X size={15} />
            取消生成
          </Button>
        )}
      </div>
      {error && (
        <p className="ai-error" role="alert">
          {error}
        </p>
      )}
      {suggestion && (
        <div className="ai-route-result">
          <div className="ai-result-heading">
            <h4>{suggestion.name}</h4>
            <span>候选路线 · {suggestion.holds.length} 个岩点</span>
          </div>
          <p>{suggestion.summary}</p>
          <div
            className="photo-wall ai-preview-wall"
            role="img"
            aria-label="AI 候选路线预览，须人工核对岩点"
          >
            <img src={image} alt="AI 候选路线所依据的岩壁照片" />
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="photo-wall-lines"
              aria-hidden="true"
            >
              <polyline points={suggestion.holds.map((hold) => `${hold.x},${hold.y}`).join(' ')} />
            </svg>
            {suggestion.holds.map((hold, index) => (
              <span
                key={index}
                className={`photo-hold hold-${hold.role}`}
                style={{ left: `${hold.x}%`, top: `${hold.y}%` }}
                aria-hidden="true"
              >
                {index + 1}
              </span>
            ))}
          </div>
          <ol className="ai-move-list">
            {suggestion.holds.map((hold, index) => (
              <li key={index}>
                <strong>
                  {index + 1} · {HOLD_LABELS[hold.role]}
                </strong>
                <span>{hold.instruction}</span>
              </li>
            ))}
          </ol>
          {suggestion.limitations.length > 0 && (
            <div className="ai-limitations">
              <strong>需要现场确认</strong>
              <ul>
                {suggestion.limitations.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="ai-confirm-note">
            AI 坐标可能偏移或误认空墙，请逐点核对预览，应用后可手动调整。
            {hasHolds ? '应用后会替换当前岩点标记与路线名称。' : '应用后可继续手动调整。'}
            候选路线不代表动作可达、安全或专业定级。
          </p>
          <div className="ai-result-actions">
            <Button
              type="button"
              onClick={() => {
                onApply(suggestion);
                setSuggestion(null);
              }}
            >
              <Check size={16} />
              确认并应用到草稿
            </Button>
            <Button type="button" variant="ghost" onClick={() => setSuggestion(null)}>
              放弃这次建议
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

import { ArrowUpRight, Camera, Focus, ImagePlus, LockKeyhole, Route } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useEffect, useState } from 'react';
import { getAiStatus } from '../lib/ai-client';
import type { AiServiceStatus } from '../lib/ai';
import { Button } from './ui';

export function PhotoRouteModule() {
  const { open } = useApp();
  const [aiStatus, setAiStatus] = useState<AiServiceStatus | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void getAiStatus(false, controller.signal)
      .then(setAiStatus)
      .catch(() => {});
    return () => controller.abort();
  }, []);
  return (
    <section className="photo-route-module" aria-labelledby="photo-route-heading">
      <div className="photo-route-intro">
        <div className="photo-route-copy">
          <div className="photo-route-label">
            <Camera size={17} />
            <span>照片定线 · 室内抱石</span>
            <span className="photo-ai-status">
              {aiStatus?.status === 'verified'
                ? 'DeepSeek · 已验证'
                : aiStatus?.status === 'auth-error'
                  ? 'DeepSeek · 鉴权失败'
                  : aiStatus?.status === 'configured'
                    ? 'DeepSeek · 待验证'
                    : aiStatus?.status === 'unconfigured'
                      ? 'DeepSeek · 待配置'
                      : 'DeepSeek · 连接待检查'}
            </span>
          </div>
          <h1 id="photo-route-heading">拍下岩壁，发现新的攀爬可能</h1>
          <p>用一张照片开始，让 DeepSeek 构思候选路线，核对岩点后留下你的攀爬计划。</p>
          <Button onClick={() => open({ type: 'photo-route' })}>
            <ImagePlus size={17} />
            拍照 / 上传岩壁
            <ArrowUpRight size={16} />
          </Button>
        </div>
        <div className="photo-route-process">
          <h3>拍照生成路线</h3>
          <ol>
            <li>
              <Camera size={18} />
              <span>
                拍摄完整墙面<small>正面拍摄，岩点清晰可见</small>
              </span>
            </li>
            <li>
              <Focus size={18} />
              <span>
                AI 分析与构思<small>识别岩点，建议动作顺序</small>
              </span>
            </li>
            <li>
              <Route size={18} />
              <span>
                确认并保存<small>核对岩点，保存到记录中收藏</small>
              </span>
            </li>
          </ol>
        </div>
      </div>
      <p className="photo-route-privacy">
        <LockKeyhole size={13} />
        草稿保存在当前浏览器。仅在你点击 AI 生成时，将照片与训练目标发送给配置的 DeepSeek 服务商。
      </p>
    </section>
  );
}

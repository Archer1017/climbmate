import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Camera,
  ImagePlus,
  LoaderCircle,
  Plus,
  Save,
  Trash2,
  Undo2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  createId,
  HOLD_LABELS,
  PHOTO_FOCUS_LABELS,
  validatePhotoRoute,
  type HoldRole,
  type PhotoHold,
  type PhotoRoute,
} from '../lib';
import { readPhoto } from '../lib/photos';
import type { AiRouteSuggestion } from '../lib/ai';
import { AiRoutePanel } from './AiRoutePanel';
import { Button, ConfirmDelete, FormErrors, FormField, Modal, SafetyNote } from './ui';

function endpoints(holds: PhotoHold[]): PhotoHold[] {
  return holds.map((hold, index) => ({
    ...hold,
    role:
      index === 0
        ? 'start'
        : index === holds.length - 1
          ? 'finish'
          : hold.role === 'start' || hold.role === 'finish'
            ? 'hand'
            : hold.role,
  }));
}

export function PhotoRouteForm({ id }: { id?: string }) {
  const { state, update, close, notify, go } = useApp();
  const existing = state.photoRoutes.find((route) => route.id === id);
  const [draft, setDraft] = useState<PhotoRoute>(
    () =>
      existing || {
        id: createId('photo-route'),
        ownerId: state.user.id,
        favorite: false,
        name: '',
        location: '',
        image: '',
        holds: [],
        focus: 'technique',
        notes: '',
        source: 'manual',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [replacing, setReplacing] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const camera = useRef<HTMLInputElement>(null);
  const album = useRef<HTMLInputElement>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const patch = (values: Partial<PhotoRoute>) =>
    setDraft((previous) => ({
      ...previous,
      ...values,
      ...('holds' in values ||
      'image' in values ||
      ('focus' in values && values.focus !== previous.focus)
        ? { source: 'manual' as const, ai: undefined }
        : {}),
    }));
  function applyAi(suggestion: AiRouteSuggestion) {
    setDraft((previous) => ({
      ...previous,
      name: suggestion.name,
      holds: suggestion.holds.map(({ x, y, role }) => ({ id: createId('hold'), x, y, role })),
      source: 'deepseek',
      ai: suggestion,
    }));
    setSelected(null);
    setErrors({});
    notify('AI 建议已应用，请核对后保存草稿');
  }
  async function upload(file?: File) {
    if (!file) return;
    setUploading(true);
    setErrors({});
    try {
      const image = await readPhoto(file, 1400, 0.8);
      if (!alive.current) return;
      patch({ image, holds: [] });
      setSelected(null);
      setReplacing(false);
    } catch (error) {
      if (alive.current)
        setErrors({ image: error instanceof Error ? error.message : '照片处理失败，请重试' });
    } finally {
      if (alive.current) setUploading(false);
    }
  }
  function addHold(x: number, y: number) {
    if (draft.holds.length >= 40) {
      setErrors({ holds: '最多标记 40 个岩点，请先移除不需要的岩点' });
      return;
    }
    const hold: PhotoHold = { id: createId('hold'), x, y, role: 'hand' };
    patch({ holds: endpoints([...draft.holds, hold]) });
    setSelected(hold.id);
    setErrors({});
  }
  function clickWall(event: MouseEvent<HTMLDivElement>) {
    if (aiBusy) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    addHold(
      Math.max(3, Math.min(97, ((event.clientX - bounds.left) / bounds.width) * 100)),
      Math.max(3, Math.min(97, ((event.clientY - bounds.top) / bounds.height) * 100)),
    );
  }
  function removeHold(holdId: string) {
    patch({ holds: endpoints(draft.holds.filter((hold) => hold.id !== holdId)) });
    if (selected === holdId) setSelected(null);
  }
  function moveHold(index: number, direction: number) {
    const holds = [...draft.holds];
    [holds[index], holds[index + direction]] = [holds[index + direction], holds[index]];
    patch({ holds: endpoints(holds) });
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    const next = {
      ...draft,
      name: draft.name.trim(),
      location: draft.location.trim(),
      notes: draft.notes.trim(),
      updatedAt: new Date().toISOString(),
    };
    const issues = validatePhotoRoute(next);
    setErrors(issues);
    if (Object.keys(issues).length) return;
    if (
      update((previous) => ({
        ...previous,
        photoRoutes: existing
          ? previous.photoRoutes.map((route) => (route.id === id ? next : route))
          : [...previous.photoRoutes, next],
      }))
    ) {
      close();
      if (!existing) go('/records?view=photos');
      notify(existing ? '照片路线已更新' : '照片路线已保存，可在记录中收藏和编辑');
    }
  }
  const activeHold = draft.holds.find((hold) => hold.id === selected);
  return (
    <Modal
      title={existing ? '编辑照片路线' : '拍照生成路线'}
      description="室内抱石照片工作台 · 用 DeepSeek 分析照片、构思候选路线，人工确认后保存。"
      onClose={close}
      wide
    >
      <form onSubmit={submit} noValidate>
        <div className="modal-body photo-route-form">
          <ol className="photo-editor-steps" aria-label="照片路线步骤">
            <li
              className={!draft.image ? 'current' : ''}
              aria-current={!draft.image ? 'step' : undefined}
            >
              1 拍摄墙面
            </li>
            <li
              className={draft.image ? 'current' : ''}
              aria-current={draft.image ? 'step' : undefined}
            >
              2 标记与编辑
            </li>
            <li>3 保存草稿</li>
          </ol>
          {(!draft.image || replacing) && (
            <div className="photo-upload-area" aria-busy={uploading}>
              <Camera size={32} strokeWidth={1.3} />
              <h3>{replacing ? '选择新的岩壁照片' : '从一面岩壁开始'}</h3>
              <p>
                正面拍下一面完整岩壁，让墙面尽量占满画面，保留起点、终点和落地区域。
                <br />
                支持 JPG、PNG、WebP、GIF，最大 8 MB。
              </p>
              <div className="photo-upload-actions">
                <Button type="button" disabled={uploading} onClick={() => camera.current?.click()}>
                  <Camera size={16} />
                  拍照
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={uploading}
                  onClick={() => album.current?.click()}
                >
                  <ImagePlus size={16} />
                  从相册选择
                </Button>
              </div>
              <small>手机支持时打开后置相机；桌面端可选择照片。</small>
              {replacing && (
                <>
                  <p className="photo-replace-warning">换图成功后会清除原照片的岩点标记。</p>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={uploading}
                    onClick={() => setReplacing(false)}
                  >
                    保留原照片
                  </Button>
                </>
              )}
            </div>
          )}
          <input
            ref={camera}
            type="file"
            capture="environment"
            accept="image/jpeg,image/png,image/webp,image/gif"
            hidden
            aria-label="拍摄岩壁照片"
            onChange={(event) => {
              void upload(event.currentTarget.files?.[0]);
              event.currentTarget.value = '';
            }}
          />
          <input
            ref={album}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            hidden
            aria-label="上传岩壁照片"
            onChange={(event) => {
              void upload(event.currentTarget.files?.[0]);
              event.currentTarget.value = '';
            }}
          />
          {uploading && (
            <p className="photo-processing" role="status">
              <LoaderCircle size={16} className="photo-spinner" />
              正在本地优化照片…
            </p>
          )}
          {draft.image && !replacing && (
            <>
              <div className="ai-focus-select">
                <FormField label="AI 训练目标">
                  <select
                    value={draft.focus}
                    disabled={aiBusy}
                    onChange={(event) =>
                      patch({ focus: event.target.value as PhotoRoute['focus'] })
                    }
                  >
                    {Object.entries(PHOTO_FOCUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>
              <AiRoutePanel
                image={draft.image}
                focus={draft.focus}
                hasHolds={draft.holds.length > 0}
                onApply={applyAi}
                onBusy={setAiBusy}
              />
              <fieldset className="photo-edit-fields" disabled={aiBusy}>
                <div className="photo-editor-toolbar">
                  <strong>标记攀爬顺序</strong>
                  <Button type="button" variant="ghost" onClick={() => setReplacing(true)}>
                    更换照片
                  </Button>
                </div>
                <p className="photo-editor-help" id="photo-wall-help">
                  按顺序点按照片添加岩点，首点为起点，末点为终点。点选编号可调整位置；也可用下方按钮与滑块完成标记。
                </p>
                <div
                  className="photo-wall"
                  role="group"
                  aria-label="岩壁照片与岩点"
                  aria-describedby="photo-wall-help"
                  onClick={clickWall}
                >
                  <img src={draft.image} alt="上传的室内抱石墙面" draggable={false} />
                  <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className="photo-wall-lines"
                    aria-hidden="true"
                  >
                    <polyline points={draft.holds.map((hold) => `${hold.x},${hold.y}`).join(' ')} />
                  </svg>
                  {draft.holds.map((hold, index) => (
                    <button
                      key={hold.id}
                      type="button"
                      className={`photo-hold hold-${hold.role} ${selected === hold.id ? 'selected' : ''}`}
                      style={{ left: `${hold.x}%`, top: `${hold.y}%` }}
                      aria-label={`岩点 ${index + 1} ${HOLD_LABELS[hold.role]}`}
                      aria-pressed={selected === hold.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelected(hold.id);
                      }}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>
                <div className="photo-hold-actions">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={draft.holds.length >= 40}
                    onClick={() => addHold(50, 50)}
                  >
                    <Plus size={15} />
                    在中心添加岩点
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={!draft.holds.length}
                    onClick={() => removeHold(draft.holds[draft.holds.length - 1].id)}
                  >
                    <Undo2 size={15} />
                    撤销上一点
                  </Button>
                  <span>{draft.holds.length} / 40 个岩点</span>
                </div>
                {activeHold && (
                  <div className="photo-position-controls">
                    <strong>
                      调整岩点 {draft.holds.findIndex((hold) => hold.id === selected) + 1} 的位置
                    </strong>
                    {(['x', 'y'] as const).map((axis) => (
                      <FormField
                        key={axis}
                        label={`${axis === 'x' ? '水平' : '垂直'}位置：${Math.round(activeHold[axis])}%`}
                      >
                        <input
                          type="range"
                          min="3"
                          max="97"
                          step="1"
                          value={activeHold[axis]}
                          onChange={(event) =>
                            patch({
                              holds: draft.holds.map((hold) =>
                                hold.id === selected
                                  ? { ...hold, [axis]: Number(event.target.value) }
                                  : hold,
                              ),
                            })
                          }
                        />
                      </FormField>
                    ))}
                  </div>
                )}
                {draft.holds.length > 0 && (
                  <ol className="photo-hold-list" aria-label="岩点顺序">
                    {draft.holds.map((hold, index) => (
                      <li key={hold.id}>
                        <button
                          type="button"
                          className="photo-hold-number"
                          aria-label={`选择岩点 ${index + 1}`}
                          onClick={() => setSelected(hold.id)}
                        >
                          {index + 1}
                        </button>
                        <select
                          aria-label={`岩点 ${index + 1} 的类型`}
                          value={hold.role}
                          onChange={(event) =>
                            patch({
                              holds: draft.holds.map((item) =>
                                item.id === hold.id
                                  ? { ...item, role: event.target.value as HoldRole }
                                  : item,
                              ),
                            })
                          }
                        >
                          {Object.entries(HOLD_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="icon-button"
                          aria-label={`上移岩点 ${index + 1}`}
                          disabled={index === 0}
                          onClick={() => moveHold(index, -1)}
                        >
                          <ArrowUp size={15} />
                        </button>
                        <button
                          type="button"
                          className="icon-button"
                          aria-label={`下移岩点 ${index + 1}`}
                          disabled={index === draft.holds.length - 1}
                          onClick={() => moveHold(index, 1)}
                        >
                          <ArrowDown size={15} />
                        </button>
                        <button
                          type="button"
                          className="icon-button"
                          aria-label={`移除岩点 ${index + 1}`}
                          onClick={() => removeHold(hold.id)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
                <p className="photo-manual-note">
                  {draft.source === 'deepseek'
                    ? '当前路线源于已确认的 DeepSeek 建议，仍可手动调整。'
                    : '当前为手动标记；可使用上方 DeepSeek 助手生成候选路线。'}
                  连线不代表动作可达或安全性判断，难度暂不自动评级。
                </p>
                {draft.ai && (
                  <details className="ai-saved-analysis">
                    <summary>查看已保存的 AI 动作建议</summary>
                    <p>{draft.ai.summary}</p>
                    <ol>
                      {draft.ai.holds.map((hold, index) => (
                        <li key={index}>{hold.instruction}</li>
                      ))}
                    </ol>
                    <p>{draft.ai.limitations.join('；')}</p>
                  </details>
                )}
                <div className="form-grid form-space">
                  <FormField label="照片路线名称" error={errors.name} full>
                    <input
                      value={draft.name}
                      maxLength={60}
                      placeholder="例如：周三的平衡练习"
                      onChange={(event) => patch({ name: event.target.value })}
                    />
                  </FormField>
                  <FormField label="岩馆名称（选填）" error={errors.location}>
                    <input
                      value={draft.location}
                      maxLength={100}
                      placeholder="这面墙在哪里？"
                      onChange={(event) => patch({ location: event.target.value })}
                    />
                  </FormField>
                  <FormField label="训练目标" error={errors.focus}>
                    <select
                      value={draft.focus}
                      onChange={(event) =>
                        patch({ focus: event.target.value as PhotoRoute['focus'] })
                      }
                    >
                      {Object.entries(PHOTO_FOCUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="动作思路与备注（选填）" error={errors.notes} full>
                    <textarea
                      rows={3}
                      value={draft.notes}
                      maxLength={1000}
                      placeholder="想练习的动作、手脚点安排，或需要现场确认的地方。"
                      onChange={(event) => patch({ notes: event.target.value })}
                    />
                  </FormField>
                </div>
                <SafetyNote>
                  照片无法判断岩点牢固程度、墙面倾角或落地风险。草稿仅供室内抱石构思，请与岩馆教练现场确认。
                </SafetyNote>
              </fieldset>
            </>
          )}
          <FormErrors errors={errors} />
          <p className="photo-local-note">
            照片压缩后仅存于当前浏览器。清除浏览器数据会丢失，可在个人中心导出备份。
          </p>
          <label className="photo-save-favorite">
            <input
              type="checkbox"
              checked={draft.favorite}
              onChange={(event) => patch({ favorite: event.target.checked })}
            />
            保存时同时收藏这条路线
          </label>
        </div>
        <div className="modal-footer">
          {existing ? (
            <ConfirmDelete
              label="删除照片路线"
              onDelete={() => {
                if (
                  update((previous) => ({
                    ...previous,
                    photoRoutes: previous.photoRoutes.filter((route) => route.id !== id),
                  }))
                ) {
                  close();
                  notify('照片路线已删除');
                }
              }}
            />
          ) : (
            <Button type="button" variant="ghost" onClick={close}>
              取消
            </Button>
          )}
          <Button type="submit" disabled={!draft.image || uploading || replacing || aiBusy}>
            <Save size={16} />
            保存路线草稿
          </Button>
        </div>
      </form>
    </Modal>
  );
}

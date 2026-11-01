import * as Dialog from '@radix-ui/react-dialog';
import { ArrowRight, Check, Compass, ShieldCheck, X, type LucideIcon } from 'lucide-react';
import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  useState,
  useEffect,
  type ReactElement,
  type ReactNode,
  type ButtonHTMLAttributes,
} from 'react';

export function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}) {
  return (
    <button className={`btn btn-${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}
export function PageTitle({
  label,
  title,
  description,
  action,
}: {
  label?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        {label && <p className="eyebrow">{label}</p>}
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>
      {action}
    </div>
  );
}
export function SectionHead({
  title,
  action,
  subtitle,
}: {
  title: string;
  action?: ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="section-head">
      <div>
        <h2>{title}</h2>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
export function TextLink({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button className="text-link" onClick={onClick}>
      {children}
      <ArrowRight size={15} />
    </button>
  );
}
export function EmptyState({
  icon: Icon = Compass,
  title,
  description,
  action,
  compact = false,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`empty-state ${compact ? 'compact' : ''}`}>
      <div className="empty-icon">
        <Icon size={25} strokeWidth={1.5} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function SafetyNote({ children }: { children?: ReactNode }) {
  return (
    <div className="safety-note">
      <ShieldCheck size={17} />
      <p>
        {children ||
          '准备充分，攀爬从容。清单仅作辅助，请遵循专业培训、装备制造商说明与现场安全检查。'}
      </p>
    </div>
  );
}
export function Progress({ value, label }: { value: number; label: string }) {
  return (
    <div
      className="progress"
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
export function CheckButton({
  checked,
  onClick,
  children,
  detail,
  critical,
}: {
  checked: boolean;
  onClick: () => void;
  children: ReactNode;
  detail?: string;
  critical?: boolean;
}) {
  return (
    <button
      role="checkbox"
      aria-checked={checked}
      className={`check-row ${checked ? 'checked' : ''}`}
      onClick={onClick}
    >
      <span className="check-box">{checked && <Check size={14} />}</span>
      <span className="check-content">
        <strong>
          {children}
          {critical && <span className="critical">重点检查</span>}
        </strong>
        {detail && <small>{detail}</small>}
      </span>
    </button>
  );
}
export function Photo({
  src,
  alt,
  className = '',
  eager = false,
}: {
  src: string;
  alt: string;
  className?: string;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (failed)
    return (
      <div className={`photo-fallback ${className}`}>
        <Compass size={26} />
        <span>照片暂不可用</span>
      </div>
    );
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={eager ? 'eager' : 'lazy'}
      onError={() => setFailed(true)}
    />
  );
}
export function Modal({
  title,
  description,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <Dialog.Root
      open
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className={`modal ${wide ? 'modal-wide' : ''}`}>
          <div className="modal-header">
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              <Dialog.Description>{description}</Dialog.Description>
            </div>
            <Dialog.Close className="icon-button" aria-label="关闭弹窗">
              <X size={20} />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function FormField({
  label,
  error,
  children,
  full = false,
}: {
  label: string;
  error?: string;
  children: ReactNode;
  full?: boolean;
}) {
  const id = useId();
  return (
    <label className={`field ${full ? 'field-full' : ''}`}>
      <span>{label}</span>
      {Children.map(children, (child) =>
        isValidElement(child) && ['input', 'select', 'textarea'].includes(String(child.type))
          ? cloneElement(child as ReactElement<Record<string, unknown>>, {
              'aria-label': label,
              'aria-invalid': !!error,
              'aria-describedby': error ? id : undefined,
            })
          : child,
      )}
      {error && (
        <small className="field-error" id={id}>
          {error}
        </small>
      )}
    </label>
  );
}
export function FormErrors({ errors }: { errors: Record<string, string> }) {
  const messages = Object.values(errors);
  useEffect(() => {
    if (Object.keys(errors).length)
      document.querySelector<HTMLElement>('[role="dialog"] [aria-invalid="true"]')?.focus();
  }, [errors]);
  return messages.length > 0 ? (
    <div className="form-errors" role="alert">
      {[...new Set(messages)].map((error) => (
        <p key={error}>{error}</p>
      ))}
    </div>
  ) : null;
}
export function ConfirmDelete({
  onDelete,
  label = '删除',
}: {
  onDelete: () => void;
  label?: string;
}) {
  const [confirm, setConfirm] = useState(false);
  return confirm ? (
    <div className="confirm-delete">
      <span>确定删除？</span>
      <Button variant="danger" type="button" onClick={onDelete}>
        确认删除
      </Button>
      <Button variant="ghost" type="button" onClick={() => setConfirm(false)}>
        取消
      </Button>
    </div>
  ) : (
    <Button
      variant="ghost"
      className="delete-button"
      type="button"
      onClick={() => setConfirm(true)}
    >
      {label}
    </Button>
  );
}

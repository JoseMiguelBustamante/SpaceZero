"use client";
import { useEffect, useRef, type ReactNode } from "react";
export function TacticalModal({
  title,
  tag,
  onClose,
  children,
  action,
  preview,
  kind = "info",
}: {
  title: string;
  tag: string;
  onClose: () => void;
  children: ReactNode;
  action?: ReactNode;
  preview?: ReactNode;
  kind?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const d = ref.current,
      previous = document.activeElement as HTMLElement | null;
    if (d && !d.open) d.showModal();
    return () => {
      d?.close();
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`world-tactical tactical-${kind}`}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        close.current();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            close.current();
        }
      }}
    >
      <div className="tactical-header">
        <div>
          <span>{tag}</span>
          <h2>{title}</h2>
        </div>
        <button
          className="tactical-close"
          onClick={onClose}
          aria-label="Volver al mapa"
        >
          ×<small>ESC</small>
        </button>
      </div>
      {preview && <div className="tactical-preview">{preview}</div>}
      <div className="tactical-body">{children}</div>
      <div
        className={`tactical-footer ${action ? "tactical-footer-action" : ""}`}
      >
        {action}
        <span className="tactical-footer-hint">
          PUEDES VOLVER AL MAPA CON ESC
        </span>
      </div>
    </dialog>
  );
}

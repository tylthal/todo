import React, { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';

export interface ModalProps {
  /** Title shown at the top of the dialog */
  title: string;
  /** Dialog body */
  children: ReactNode;
  /** Called when the user confirms */
  onConfirm?: () => void;
  /** Called when the dialog should be cancelled */
  onCancel?: () => void;
  /** Label for the confirm button */
  confirmLabel?: string;
  /** Label for the cancel button */
  cancelLabel?: string;
}

/**
 * Generic modal dialog rendered via a React portal. It blocks interaction with
 * the rest of the UI until dismissed.
 */
const Modal: React.FC<ModalProps> = ({
  title,
  children,
  onConfirm,
  onCancel,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const content = (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h3>{title}</h3>
        <div>{children}</div>
        <div className="modal-actions">
          {onCancel && <button onClick={onCancel}>{cancelLabel}</button>}
          {onConfirm && <button onClick={onConfirm}>{confirmLabel}</button>}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

export default Modal;

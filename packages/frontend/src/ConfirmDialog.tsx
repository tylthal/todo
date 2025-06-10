import React from 'react';
import Modal from './Modal';

export interface ConfirmDialogProps {
  /** Text shown inside the dialog */
  message: string;
  /** Called when the user confirms */
  onConfirm: () => void;
  /** Called when the user cancels */
  onCancel: () => void;
  /** Optional title shown at the top */
  title?: string;
  /** Label for the confirm button */
  confirmLabel?: string;
  /** Label for the cancel button */
  cancelLabel?: string;
}

/** Simple confirmation dialog built on top of {@link Modal}. */
const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  message,
  onConfirm,
  onCancel,
  title = 'Confirm',
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
}) => (
  <Modal
    title={title}
    onConfirm={onConfirm}
    onCancel={onCancel}
    confirmLabel={confirmLabel}
    cancelLabel={cancelLabel}
  >
    <p>{message}</p>
  </Modal>
);

export default ConfirmDialog;

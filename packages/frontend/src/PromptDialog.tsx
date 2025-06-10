import React, { useState } from 'react';
import Modal from './Modal';

export interface PromptDialogProps {
  title: string;
  defaultValue?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

/** Simple text input dialog built on top of {@link Modal}. */
const PromptDialog: React.FC<PromptDialogProps> = ({
  title,
  defaultValue = '',
  onConfirm,
  onCancel,
}) => {
  const [value, setValue] = useState(defaultValue);

  return (
    <Modal title={title} onConfirm={() => onConfirm(value)} onCancel={onCancel}>
      <input
        autoFocus
        value={value}
        onChange={e => setValue(e.target.value)}
        style={{ width: '100%' }}
      />
    </Modal>
  );
};

export default PromptDialog;

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
}: ConfirmDialogProps) {
  const [executando, setExecutando] = useState(false);

  async function handleConfirm() {
    setExecutando(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setExecutando(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={executando ? () => {} : onClose}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={executando}>
            {cancelLabel}
          </Button>
          <Button variant={variant} onClick={handleConfirm} loading={executando}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-4">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            variant === 'danger' ? 'bg-warn-soft-bg text-warn' : 'bg-accent-soft-bg text-accent'
          }`}
        >
          <AlertTriangle size={20} />
        </div>
        <div className="flex-1">
          <p className="font-medium text-text">{title}</p>
          {description && <p className="text-sm text-text-2 mt-1">{description}</p>}
        </div>
      </div>
    </Modal>
  );
}

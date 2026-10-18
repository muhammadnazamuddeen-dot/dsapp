import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';

const ToastContext = createContext(() => {});
const ConfirmContext = createContext(async () => false);

let nextToastId = 0;

function ToastItem({ item, onDone }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setShow(true));
    const timer = setTimeout(() => onDone(item.id), 4200);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [item.id, onDone]);

  const iconName = item.type === 'error' ? 'alert' : item.type === 'info' ? 'info' : 'check';

  return (
    <div className={`toast toast-${item.type} ${show ? 'show' : ''}`.trim()}>
      <Icon name={iconName} />
      <span>{item.message}</span>
    </div>
  );
}

export function UIProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const dialogRef = useRef(null);

  useEffect(() => {
    dialogRef.current = dialog;
  }, [dialog]);

  const toast = useCallback((message, type = 'success') => {
    const id = ++nextToastId;
    setToasts((current) => [...current, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const confirm = useCallback(
    (options) =>
      new Promise((resolve) => {
        setDialog({ ...options, resolve });
      }),
    []
  );

  const finishConfirm = useCallback((value) => {
    const current = dialogRef.current;
    dialogRef.current = null;
    setDialog(null);
    current?.resolve(value);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      <ConfirmContext.Provider value={confirm}>
        {children}

        <div className="toasts" role="status" aria-live="polite">
          {toasts.map((item) => (
            <ToastItem key={item.id} item={item} onDone={removeToast} />
          ))}
        </div>

        {dialog && (
          <Modal onClose={() => finishConfirm(false)}>
            <div className="modal-head">
              <div>
                <p className="eyebrow">Please confirm</p>
                <h3>{dialog.title}</h3>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => finishConfirm(false)}
                aria-label="Close"
              >
                <Icon name="close" />
              </button>
            </div>
            <p className="muted" style={{ fontSize: '13.5px', lineHeight: 1.6 }}>
              {dialog.message}
            </p>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => finishConfirm(false)}>
                {dialog.cancelLabel || 'Cancel'}
              </button>
              <button
                type="button"
                className={`btn ${dialog.danger ? 'btn-danger' : 'btn-primary'}`}
                onClick={() => finishConfirm(true)}
              >
                {dialog.confirmLabel || 'Confirm'}
              </button>
            </div>
          </Modal>
        )}
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

export function useConfirm() {
  return useContext(ConfirmContext);
}

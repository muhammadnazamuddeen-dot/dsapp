import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const modalStack = [];
let openCount = 0;

export function Modal({ children, className = '', onClose }) {
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    openCount += 1;
    document.body.classList.add('modal-open');

    const entry = {
      close: () => {
        if (closeRef.current) closeRef.current();
      },
    };
    modalStack.push(entry);

    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      if (modalStack[modalStack.length - 1] !== entry) return;
      if (!closeRef.current) return;
      event.preventDefault();
      closeRef.current();
    };
    document.addEventListener('keydown', onKeyDown);

    const timer = setTimeout(() => {
      const target =
        panelRef.current?.querySelector('[autofocus]') ||
        panelRef.current?.querySelector('input:not([type="hidden"]), select, textarea, button');
      target?.focus();
    }, 40);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', onKeyDown);
      const index = modalStack.indexOf(entry);
      if (index !== -1) modalStack.splice(index, 1);
      openCount -= 1;
      if (openCount <= 0) {
        openCount = 0;
        document.body.classList.remove('modal-open');
      }
    };
  }, []);

  const host = document.getElementById('modal-root') || document.body;

  return createPortal(
    <div
      className="modal-backdrop is-open"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div className={`modal ${className}`.trim()} role="dialog" aria-modal="true" ref={panelRef}>
        {children}
      </div>
    </div>,
    host
  );
}

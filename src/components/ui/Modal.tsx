import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  labelledBy: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

/**
 * Overlay + dialog shell for every modal in the app.
 *
 * Rendered through a portal into <body> on purpose. A `position: fixed` overlay only resolves
 * against the viewport while no ancestor creates a containing block — any `transform`, `filter`
 * or `backdrop-filter` further up silently re-anchors it and leaves strips of the page
 * unblurred. Both dialogs used to render deep inside the layout, so that guarantee depended on
 * styles far away from them; portalling removes the dependency entirely and also puts the
 * overlay in the root stacking context, above the fixed/sticky headers.
 */
/**
 * Both entry pages ship `viewport-fit=cover`, so in an installed PWA the overlay extends under the
 * notch and the home indicator. `max()` keeps the normal 1rem gutter everywhere else. If a browser
 * lacks `env()` the whole declaration is dropped and the `p-4` class below still applies.
 */
const SAFE_AREA_INSET: React.CSSProperties = {
  paddingTop: 'max(1rem, env(safe-area-inset-top))',
  paddingRight: 'max(1rem, env(safe-area-inset-right))',
  paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
  paddingLeft: 'max(1rem, env(safe-area-inset-left))',
};

export const Modal: React.FC<ModalProps> = ({ labelledBy, onClose, children, className = '' }) => {
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);

    // Lock the page behind the modal without letting the scrollbar's disappearance shift layout.
    const { overflow, paddingRight } = document.body.style;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
      previouslyFocused.current?.focus();
    };
  }, [onClose]);

  return createPortal(
    <div
      style={SAFE_AREA_INSET}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in overscroll-contain"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onClick={(event) => event.stopPropagation()}
        className={`modal-panel relative w-full overflow-y-auto overscroll-contain rounded-2xl shadow-2xl animate-slide-up ${className}`}
      >
        {children}
      </div>
    </div>,
    document.body
  );
};

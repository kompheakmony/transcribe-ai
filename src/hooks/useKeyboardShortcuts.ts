import { useEffect, useRef } from 'react';

interface ShortcutHandlers {
  onTogglePlay: () => void;
  onSkipForward: () => void;
  onSkipBackward: () => void;
  onFrameForward: () => void;
  onFrameBackward: () => void;
  onDeleteSubtitle: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers, enabled: boolean) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          handlersRef.current.onTogglePlay();
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (e.shiftKey) {
            handlersRef.current.onFrameForward();
          } else {
            handlersRef.current.onSkipForward();
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (e.shiftKey) {
            handlersRef.current.onFrameBackward();
          } else {
            handlersRef.current.onSkipBackward();
          }
          break;
        case 'Delete':
        case 'Backspace':
          if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
            handlersRef.current.onDeleteSubtitle();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
}

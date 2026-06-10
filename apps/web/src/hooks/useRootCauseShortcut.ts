import { useEffect } from 'react';
import { useAuthStore } from '../store';

export function useRootCauseShortcut(onTrigger: () => void, isPanelOpen: boolean) {
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Must be Ctrl + F12
      if (!e.ctrlKey || e.key !== 'F12') return;

      // Only allow admins and super_admins
      if (user?.role !== 'admin' && user?.role !== 'super_admin') return;

      // If user is typing into an input, ignore it unless the panel is already open
      if (!isPanelOpen && e.target instanceof HTMLElement) {
        const tagName = e.target.tagName.toLowerCase();
        const isInput = tagName === 'input' || tagName === 'textarea';
        const isContentEditable = e.target.isContentEditable;
        
        if (isInput || isContentEditable) {
          // If they are explicitly inside an input, we normally ignore it 
          // to prevent accidental triggers while typing text.
          // BUT since F12 is a function key, it's rarely used in normal text editing.
          // We'll allow it.
        }
      }

      e.preventDefault();
      onTrigger();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [user?.role, isPanelOpen, onTrigger]);
}

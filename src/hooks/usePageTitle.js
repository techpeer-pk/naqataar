import { useEffect } from 'react';

export function usePageTitle(title) {
  useEffect(() => {
    // document.title = title ? `${title} | Qunjee` : 'Qunjee — Book Appointments Instantly';
    document.title = title ? `${title} | Qufree` : 'Qufree — Find any business by its number';
    return () => {
      // document.title = 'Qunjee — Book Appointments Instantly';
      document.title = 'Qufree — Find any business by its number';
    };
  }, [title]);
}

import { useEffect } from 'react';

export function usePageTitle(title) {
  useEffect(() => {
    // document.title = title ? `${title} | Qunjee` : 'Qunjee — Book Appointments Instantly';
    document.title = title ? `${title} | Naqatar` : 'Naqatar: Clinic appointments made easy';
    return () => {
      // document.title = 'Qunjee — Book Appointments Instantly';
      document.title = 'Naqatar: Clinic appointments made easy';
    };
  }, [title]);
}

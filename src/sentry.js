import * as Sentry from '@sentry/react';

const DSN = import.meta.env.VITE_SENTRY_DSN;

// No-op in local dev / until a DSN is configured — same convention as
// useEmailNotifications.js's EmailJS senders.
if (DSN) {
  Sentry.init({
    dsn: DSN,
    environment: import.meta.env.MODE,
  });
}

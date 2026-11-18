import { CalendarCheck, Clock, MapPin, Bell } from 'lucide-react';
import { useCountdown } from '../../hooks/useCountdown';
import { formatTime12h } from '../../utils/format';
import './ReminderBanner.css';
import { t } from '../../i18n';

// Countdown copy — all strings go through t() (Hinglish dictionary).
const URGENCY_CONFIG = {
  future: {
    emoji: '📆',
    headline: (d) => t(d === 1 ? '{d} day to go' : '{d} days to go', { d }),
    countdown: (d, h, m, s) => t('{d}d {h}hr {m}min {s}sec left', { d, h, m, s }),
    note: 'Mark your calendar!',
  },
  calm: {
    emoji: '📅',
    headline: () => t('See you tomorrow!'),
    countdown: (d, h, m, s) => t('{h}hr {m}min {s}sec left', { h, m, s }),
    note: 'Your appointment is tomorrow.',
  },
  urgent: {
    emoji: '⏰',
    headline: () => t('Almost time!'),
    countdown: (d, h, m, s) => t('{m}min {s}sec remaining', { m, s }),
    note: 'Get ready — time to head out!',
  },
  excited: {
    emoji: '🎉',
    headline: () => t('Hurray!'),
    countdown: (d, h, m, s) => t('{m}min {s}sec left', { m, s }),
    note: "You're almost there!",
  },
  now: {
    emoji: '🎊',
    headline: () => t('Your appointment is NOW!'),
    countdown: () => t("It's time!"),
    note: "Head in — they're waiting for you!",
  },
};

export default function ReminderBanner({ appointment }) {
  const cd = useCountdown(appointment?.appointmentDatetime);

  if (!cd) return null;

  const config = URGENCY_CONFIG[cd.urgencyLevel];
  if (!config) return null;

  return (
    <div className={`reminder-banner reminder-banner--${cd.urgencyLevel} fade-up`} role="status">
      <div className="reminder-pulse-ring" aria-hidden="true" />

      <div className="reminder-emoji" aria-hidden="true">{config.emoji}</div>

      <div className="reminder-body">
        <p className="reminder-headline">
          {config.headline(cd.days, cd.hours, cd.minutes, cd.seconds)}
        </p>
        <p className="reminder-countdown" aria-live="polite">
          {config.countdown(cd.days, cd.hours, cd.minutes, cd.seconds)}
        </p>
        <p className="reminder-note">{t(config.note)}</p>
      </div>

      <div className="reminder-details">
        <div className="reminder-detail-item">
          <CalendarCheck size={14} />
          <span>{appointment.businessName}</span>
        </div>
        <div className="reminder-detail-item">
          <Bell size={14} />
          <span>{appointment.serviceName}</span>
        </div>
        <div className="reminder-detail-item">
          <Clock size={14} />
          <span>{t('{date} at {time}', { date: appointment.date, time: formatTime12h(appointment.time) })}</span>
        </div>
        {appointment.businessAddress && (
          <div className="reminder-detail-item">
            <MapPin size={14} />
            <span>{appointment.businessAddress}</span>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import {
  format, addDays, startOfDay, isSameDay, isSameMonth,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Sun, CloudSun, Moon } from 'lucide-react';
import { useSlots } from '../../hooks/useSlots';
import { formatTime12h, dayPart } from '../../utils/format';
import './SlotPicker.css';
import { t } from '../../i18n';

const MAX_DAYS = 31;
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const GROUP_META = {
  noon:    { label: 'Day',     Icon: Sun },
  evening: { label: 'Evening', Icon: CloudSun },
  night:   { label: 'Night',   Icon: Moon },
};

/** Bucket chronological slots into Day/Evening/Night sections, preserving order. */
function groupSlots(slots) {
  const groups = [];
  const byKey = new Map();
  for (const time of slots) {
    const key = dayPart(time);
    if (!byKey.has(key)) {
      const group = { key, ...GROUP_META[key], items: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    byKey.get(key).items.push(time);
  }
  return groups;
}

export default function SlotPicker({ business, service, selectedDate, selectedTime, onDateChange, onTimeChange }) {
  const { slots, loading, fetchSlots, getOpenDates } = useSlots();

  const today   = startOfDay(new Date());
  const maxDate = addDays(today, MAX_DAYS - 1);
  const [viewMonth, setViewMonth] = useState(startOfMonth(selectedDate || today));

  const openSet = new Set(getOpenDates(business, MAX_DAYS).map(d => format(d, 'yyyy-MM-dd')));

  // Full weeks (Sun-start) covering the visible month, so the grid is always
  // a clean multiple of 7 — days outside the month render as blank spacers.
  const gridStart = startOfWeek(startOfMonth(viewMonth));
  const gridEnd   = endOfWeek(endOfMonth(viewMonth));
  const days = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) days.push(d);

  const canPrevMonth = startOfMonth(viewMonth) > startOfMonth(today);
  const canNextMonth = startOfMonth(viewMonth) < startOfMonth(maxDate);

  useEffect(() => {
    if (selectedDate) fetchSlots(business, selectedDate, service);
  }, [selectedDate, business, service]);

  return (
    <div className="slot-picker">
      <div className="cal-wrap">
        <div className="cal-header">
          <button className="strip-nav" onClick={() => setViewMonth(m => addMonths(m, -1))} disabled={!canPrevMonth} aria-label={t('Previous month')}>
            <ChevronLeft size={18} />
          </button>
          <span className="cal-month-label">{format(viewMonth, 'MMMM yyyy')}</span>
          <button className="strip-nav" onClick={() => setViewMonth(m => addMonths(m, 1))} disabled={!canNextMonth} aria-label={t('Next month')}>
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="cal-weekday-row">
          {WEEKDAY_LABELS.map(w => <span key={w} className="cal-weekday">{w}</span>)}
        </div>

        <div className="cal-grid">
          {days.map(date => {
            const key      = format(date, 'yyyy-MM-dd');
            const inMonth  = isSameMonth(date, viewMonth);
            if (!inMonth) return <div key={key} className="cal-cell empty" aria-hidden="true" />;

            const isOpen   = openSet.has(key) && date >= today && date <= maxDate;
            const isSel    = selectedDate && isSameDay(date, selectedDate);
            const isToday  = isSameDay(date, today);
            return (
              <button
                key={key}
                className={`cal-cell ${isSel ? 'selected' : ''} ${!isOpen ? 'closed' : ''} ${isToday ? 'today' : ''}`}
                disabled={!isOpen}
                onClick={() => { onDateChange(date); onTimeChange(null); }}
              >
                <span className="cal-cell-num">{format(date, 'd')}</span>
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="time-slots-wrap">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '1rem' }}>
              <div className="spinner" style={{ margin: '0 auto' }} />
            </div>
          ) : slots.length === 0 ? (
            <p className="no-slots">{t('No slots available for this date.')}</p>
          ) : (
            groupSlots(slots).map(group => (
              <div className="time-slot-group" key={group.key}>
                <div className="time-slot-group-header">
                  <group.Icon size={14} />
                  <span>{t(group.label)}</span>
                </div>
                <div className="time-slots">
                  {group.items.map(time => (
                    <button
                      key={time}
                      className={`time-slot ${selectedTime === time ? 'selected' : ''}`}
                      onClick={() => onTimeChange(time)}
                    >
                      {formatTime12h(time)}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import {
  format, addDays, addMonths, isSameDay, isSameMonth, startOfDay,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './MonthCalendarPicker.css';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Generic month-grid date picker — same visual pattern as the booking
// wizard's SlotPicker calendar, but no open/closed-day concept: any date
// on/after `minDate` is selectable. Used for SuperAdmin's subscription
// "Active Until" date.
export default function MonthCalendarPicker({ value, onChange, minDate = null }) {
  const [viewMonth, setViewMonth] = useState(startOfMonth(value || new Date()));
  const min = minDate ? startOfDay(minDate) : null;

  const gridStart = startOfWeek(startOfMonth(viewMonth));
  const gridEnd   = endOfWeek(endOfMonth(viewMonth));
  const days = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) days.push(d);

  const canPrevMonth = !min || startOfMonth(viewMonth) > startOfMonth(min);

  return (
    <div className="mcp-wrap">
      <div className="mcp-header">
        <button type="button" className="mcp-nav" onClick={() => setViewMonth(m => addMonths(m, -1))} disabled={!canPrevMonth} aria-label="Previous month">
          <ChevronLeft size={16} />
        </button>
        <span className="mcp-month-label">{format(viewMonth, 'MMMM yyyy')}</span>
        <button type="button" className="mcp-nav" onClick={() => setViewMonth(m => addMonths(m, 1))} aria-label="Next month">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="mcp-weekday-row">
        {WEEKDAY_LABELS.map(w => <span key={w} className="mcp-weekday">{w}</span>)}
      </div>

      <div className="mcp-grid">
        {days.map(date => {
          const key     = format(date, 'yyyy-MM-dd');
          const inMonth = isSameMonth(date, viewMonth);
          if (!inMonth) return <div key={key} className="mcp-cell empty" aria-hidden="true" />;

          const disabled = min && date < min;
          const isSel    = value && isSameDay(date, value);
          const isToday  = isSameDay(date, new Date());
          return (
            <button
              type="button"
              key={key}
              className={`mcp-cell ${isSel ? 'selected' : ''} ${disabled ? 'closed' : ''} ${isToday ? 'today' : ''}`}
              disabled={disabled}
              onClick={() => onChange(date)}
            >
              <span className="mcp-cell-num">{format(date, 'd')}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

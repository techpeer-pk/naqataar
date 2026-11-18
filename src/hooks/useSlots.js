import { useState, useCallback } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { format, addDays, startOfDay } from 'date-fns';
import {
  DAY_KEYS, generateTimeSlots, computeAvailable, toMinutes, resolveDayBounds,
} from '../utils/slots';

/**
 * Availability read-side.
 *
 * Booked inventory lives in a per-slot lock subcollection:
 *   businesses/{id}/slots/{YYYY-MM-DD_HH-mm} -> { date, time, capacity, booked, apptIds }
 * A slot doc only exists once it has at least one booking. Availability is the
 * generated grid minus slots whose `booked >= capacity`, duration-aware for the
 * selected service. Writes (claim/release) happen transactionally in useBooking.
 */
export function useSlots() {
  const [slots, setSlots]   = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchSlots = useCallback(async (business, date, service = null) => {
    setLoading(true);
    setSlots([]);
    try {
      const dayKey   = DAY_KEYS[date.getDay()];
      const dayHours = business.workingHours?.[dayKey];
      if (!dayHours?.open || !dayHours?.close) { setSlots([]); return; }

      const slotDuration = business.slotDuration || 30;
      const capacity     = business.slotCapacity || 1;
      const grid         = generateTimeSlots(dayHours.open, dayHours.close, slotDuration);
      const dayBounds    = resolveDayBounds(dayHours.open, dayHours.close);

      // Read lock docs for this date -> map of time -> booked count
      const dateStr = format(date, 'yyyy-MM-dd');
      const snap = await getDocs(query(
        collection(db, 'businesses', business.id, 'slots'),
        where('date', '==', dateStr),
      ));
      const bookedMap = {};
      snap.forEach(d => { const x = d.data(); bookedMap[x.time] = x.booked || 0; });

      const now     = new Date();
      const isToday = dateStr === format(now, 'yyyy-MM-dd');
      const nowCtx  = {
        isToday,
        nowMinutes:  now.getHours() * 60 + now.getMinutes(),
        openMinutes: toMinutes(dayHours.open),
      };

      const available = computeAvailable(
        grid, bookedMap, capacity, service?.duration, slotDuration, nowCtx, dayBounds,
      );
      setSlots(available);
    } finally {
      setLoading(false);
    }
  }, []);

  // Dates (up to `daysAhead`) the business is open and still has time left today.
  const getOpenDates = useCallback((business, daysAhead = 60) => {
    const open = [];
    const today = startOfDay(new Date());
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

    for (let i = 0; i < daysAhead; i++) {
      const d      = addDays(today, i);
      const dayKey = DAY_KEYS[d.getDay()];
      const hours  = business.workingHours?.[dayKey];
      if (!hours?.open || !hours?.close) continue;

      if (i === 0) {
        const { closeMinutes } = resolveDayBounds(hours.open, hours.close);
        const minAhead = business.slotDuration || 30;
        if (nowMinutes >= closeMinutes - minAhead) continue;
      }
      open.push(d);
    }
    return open;
  }, []);

  return { slots, loading, fetchSlots, getOpenDates };
}

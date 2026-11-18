import { useEffect, useRef } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { requestFcmToken } from '../utils/fcmToken';

/**
 * Requests browser notification permission and saves FCM token to Firestore.
 * Also schedules local browser notifications at 24hr / 1hr / 15min before appointment.
 *
 * NOTE: Scheduled local notifications fire only while the browser is running.
 * True background push (app closed) requires Firebase Cloud Functions (Blaze plan).
 */
export function useReminders(appointmentId, appointmentDatetime) {
  const scheduledRef = useRef(new Set());

  useEffect(() => {
    if (!appointmentId || !appointmentDatetime) return;

    const targetMs = toMs(appointmentDatetime);
    if (!targetMs) return;

    requestAndSaveFcmToken(appointmentId);
    scheduleLocalNotifications(targetMs, scheduledRef.current);
  }, [appointmentId, appointmentDatetime]);
}

function toMs(value) {
  if (!value) return null;
  if (value?.toDate) return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  return new Date(value).getTime();
}

async function requestAndSaveFcmToken(appointmentId) {
  try {
    const token = await requestFcmToken();
    if (!token) return;
    await updateDoc(doc(db, 'appointments', appointmentId), { fcmToken: token });
  } catch {
    // FCM not supported or user denied — silent fail, local notifications still work
  }
}

function scheduleLocalNotifications(targetMs, scheduled) {
  if (!('Notification' in window)) return;

  const reminders = [
    {
      id: '24hr',
      offsetMs: 24 * 60 * 60 * 1000,
      title: 'Appointment Tomorrow! 📅',
      body: 'Your appointment is tomorrow. Get ready!',
    },
    {
      id: '1hr',
      offsetMs: 60 * 60 * 1000,
      title: 'Almost Time! ⏰',
      body: 'Your appointment is in 1 hour. Time to head out!',
    },
    {
      id: '15min',
      offsetMs: 15 * 60 * 1000,
      title: 'Hurray! Almost There! 🎉',
      body: 'Your appointment is in just 15 minutes!',
    },
  ];

  for (const r of reminders) {
    if (scheduled.has(r.id)) continue;
    const fireAt = targetMs - r.offsetMs;
    const delay  = fireAt - Date.now();
    if (delay <= 0) continue;   // past threshold — skip

    scheduled.add(r.id);
    setTimeout(async () => {
      if (Notification.permission !== 'granted') return;
      try {
        const reg = await navigator.serviceWorker?.ready;
        if (reg) {
          reg.showNotification(r.title, {
            body: r.body,
            icon: '/icons-naqatar/icon-192x192.png',
            badge: '/icons-naqatar/badge-monochrome.png',
          });
        } else {
          new Notification(r.title, { body: r.body, icon: '/icons-naqatar/icon-192x192.png' });
        }
      } catch {
        // Notification API unavailable
      }
    }, delay);
  }
}

import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const REF = () => doc(db, 'config', 'gamify');

// 2026-09-21: old shape was 9 per-door messages, from the "open every door"
// mechanic. Replaced by the single-winner mechanic's win/lose pair below —
// kept here, commented out, in case the old mechanic comes back.
// const DEFAULT_SETTINGS = {
//   enabled: true,
//   surpriseMessages: [
//     '🎁 Surprise coming soon!',
//     '✨ Something special is brewing...',
//     '🎉 You found a hidden treat!',
//     '🌟 Lucky you!',
//     '🎊 A little something for you!',
//     '💫 Stay tuned for more!',
//     '🎈 You\'re on a roll!',
//     '🏆 Nice pick!',
//     '🎯 Bullseye — more coming soon!',
//   ],
// };

// Defaults used until SuperAdmin saves settings for the first time (or if
// the doc is ever missing) — matches the original hardcoded prototype copy,
// so /gamify keeps working exactly as before with zero config.
const DOOR_COUNT = 9; // must match DOOR_COUNT in GamifyPage.jsx
export const SESSION_LOCK_HOURS_OPTIONS = [2, 6, 12, 24]; // fixed choices, SuperAdmin picks one — not free text

const DEFAULT_SETTINGS = {
  enabled: true,
  gameTitle: 'TrueKey', // SuperAdmin-configurable game name, shown in the page's <h1>
  winMessage: 'Your Reward 🎉',
  loseMessage: 'Better Luck - Next time',
  winningDoorCount: 3, // how many of the 9 doors win — SuperAdmin-configurable
  maxPlayAgain: 3, // how many times the "Play Again" button can be used per session — SuperAdmin-configurable
  sessionLockHours: 24, // cooldown (localStorage-based, see GamifyPage.jsx) once a visitor exhausts their plays
};

// Live, not a one-time getDoc — a SuperAdmin toggle/edit should reach anyone
// already on /gamify immediately, same reasoning as useCategoryVisibility.js.
export function useGamifySettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(REF(), (snap) => {
      const data = snap.exists() ? snap.data() : {};
      setSettings({
        enabled: data.enabled !== false,
        gameTitle: typeof data.gameTitle === 'string' && data.gameTitle.trim()
          ? data.gameTitle
          : DEFAULT_SETTINGS.gameTitle,
        winMessage: typeof data.winMessage === 'string' && data.winMessage.trim()
          ? data.winMessage
          : DEFAULT_SETTINGS.winMessage,
        loseMessage: typeof data.loseMessage === 'string' && data.loseMessage.trim()
          ? data.loseMessage
          : DEFAULT_SETTINGS.loseMessage,
        winningDoorCount: Number.isInteger(data.winningDoorCount) && data.winningDoorCount >= 1 && data.winningDoorCount <= DOOR_COUNT
          ? data.winningDoorCount
          : DEFAULT_SETTINGS.winningDoorCount,
        maxPlayAgain: Number.isInteger(data.maxPlayAgain) && data.maxPlayAgain >= 0
          ? data.maxPlayAgain
          : DEFAULT_SETTINGS.maxPlayAgain,
        sessionLockHours: SESSION_LOCK_HOURS_OPTIONS.includes(data.sessionLockHours)
          ? data.sessionLockHours
          : DEFAULT_SETTINGS.sessionLockHours,
      });
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);

  const updateSettings = useCallback(async (data) => {
    await setDoc(REF(), data, { merge: true });
  }, []);

  return { settings, loading, updateSettings };
}

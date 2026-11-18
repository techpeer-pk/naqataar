import { useState, useRef, useCallback, useEffect } from 'react';
import { KeyRound, Lock } from 'lucide-react'; // RotateCw and Move dropped — see notes below (manual Play Again button, then the title's decorative icons)
import toast from 'react-hot-toast';
import { useGamifySettings } from '../../hooks/useGamifySettings';
import './GamifyPage.css';

const DOOR_COUNT = 9;
const RIBBON_COUNT = 36;
const RIBBON_COLORS = ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#a855f7', '#ec4899'];
const GOLD_FLAKE_COUNT = 14; // ambient + continuous, so kept much lighter than the one-shot ribbon burst

// Ambient background flakes — ribbon-blast's technique (plain CSS
// @keyframes, no library, see discussion with user before building this)
// but looping (animation-iteration-count: infinite) instead of one-shot,
// and far fewer of them since this runs the whole time the page is open.
function GoldFlakes({ flakes }) {
  return (
    <div className="gamify-gold-flakes" aria-hidden="true">
      {flakes.map((f) => (
        <span
          key={f.id}
          className="gamify-gold-flake"
          style={{
            left: `${f.left}%`,
            width: `${f.size}px`,
            height: `${f.size}px`,
            animationDuration: `${f.duration}s`,
            animationDelay: `${f.delay}s`,
            '--flake-drift': `${f.drift}px`,
          }}
        />
      ))}
    </div>
  );
}

// `count` unique random indices out of DOOR_COUNT, no repeats (Fisher-Yates
// partial shuffle). count comes from settings.winningDoorCount (SuperAdmin
// win-rate control, see useGamifySettings.js) — win rate = count/DOOR_COUNT.
function pickWinningDoors(count) {
  const indices = Array.from({ length: DOOR_COUNT }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, count);
}

// 2026-09-22: session lock — once a visitor exhausts their plays, they're
// locked out for settings.sessionLockHours. Device-local (localStorage),
// not Firestore — the game is guest-accessible (no login), so there's no
// account to tie a server-side lock to; this is a soft, easily-bypassed-by-
// clearing-cache limit, acceptable since rewards are still placeholder text
// (see CLAUDE.md's integrity-critical-logic notes — this isn't that kind of
// stakes yet). Distinct from the disabled/commented daily-reset block above
// — that was a calendar-day reset, this is a rolling N-hour cooldown.
const LOCK_STORAGE_KEY = 'truekey_lock_until';

function readLockUntil() {
  try {
    const raw = localStorage.getItem(LOCK_STORAGE_KEY);
    const ms = raw ? Number(raw) : null;
    return Number.isFinite(ms) ? ms : null;
  } catch {
    return null;
  }
}

function writeLockUntil(untilMs) {
  try {
    localStorage.setItem(LOCK_STORAGE_KEY, String(untilMs));
  } catch {
    // localStorage unavailable (private mode etc.) — lock just won't persist for this visitor
  }
}

// e.g. "23h 45m" / "45m" — hours-granularity durations don't need seconds.
function formatRemaining(untilMs) {
  const remainingMs = Math.max(0, untilMs - Date.now());
  const totalMinutes = Math.ceil(remainingMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

// Daily localStorage persistence disabled for now (2026-09-21) — user asked
// for no session binding, game resets on every refresh. Kept here, commented
// out, in case the daily-limit mechanic comes back later.
// function todayStorageKey() {
//   const d = new Date();
//   const y = d.getFullYear();
//   const m = String(d.getMonth() + 1).padStart(2, '0');
//   const day = String(d.getDate()).padStart(2, '0');
//   return `gamify_opens_${y}-${m}-${day}`;
// }
//
// function loadOpenedDoors() {
//   try {
//     const raw = localStorage.getItem(todayStorageKey());
//     const parsed = raw ? JSON.parse(raw) : [];
//     return Array.isArray(parsed) ? parsed : [];
//   } catch {
//     return [];
//   }
// }
//
// function saveOpenedDoors(doors) {
//   try {
//     localStorage.setItem(todayStorageKey(), JSON.stringify(doors));
//   } catch {
//     // localStorage unavailable (private mode etc.) — game just won't persist across refresh
//   }
// }

// 2026-09-21: old mechanic was "open every door, each has its own message".
// Replaced with a single-winner mechanic below (1 of DOOR_COUNT doors wins,
// a miss reveals where the win actually was) — kept here, commented out, in
// case the old mechanic is wanted back.
// export default function GamifyPage() {
//   const { settings, loading: settingsLoading } = useGamifySettings();
//   const [openedDoors, setOpenedDoors] = useState([]);
//   const [dragging, setDragging] = useState(false);
//   const [openingDoor, setOpeningDoor] = useState(null);
//
//   const keyRef = useRef(null);
//   const doorRefs = useRef([]);
//   const dragStart = useRef({ x: 0, y: 0 });
//
//   const allOpened = openedDoors.length === DOOR_COUNT;
//
//   const handlePointerDown = useCallback((e) => {
//     if (allOpened) return;
//     const key = keyRef.current;
//     if (!key) return;
//     key.setPointerCapture(e.pointerId);
//     dragStart.current = { x: e.clientX, y: e.clientY };
//     setDragging(true);
//   }, [allOpened]);
//
//   const handlePointerMove = useCallback((e) => {
//     if (!dragging) return;
//     const key = keyRef.current;
//     if (!key) return;
//     const dx = e.clientX - dragStart.current.x;
//     const dy = e.clientY - dragStart.current.y;
//     key.style.transform = `translate(${dx}px, ${dy}px)`;
//   }, [dragging]);
//
//   const handlePointerUp = useCallback((e) => {
//     if (!dragging) return;
//     setDragging(false);
//     const key = keyRef.current;
//     if (key) key.style.transform = '';
//
//     let hitIndex = -1;
//     doorRefs.current.forEach((el, i) => {
//       if (hitIndex !== -1 || openedDoors.includes(i)) return;
//       const rect = el?.getBoundingClientRect();
//       if (
//         rect &&
//         e.clientX >= rect.left && e.clientX <= rect.right &&
//         e.clientY >= rect.top && e.clientY <= rect.bottom
//       ) {
//         hitIndex = i;
//       }
//     });
//
//     if (hitIndex !== -1) {
//       setOpeningDoor(hitIndex);
//       window.setTimeout(() => {
//         setOpeningDoor(null);
//         setOpenedDoors((prev) => {
//           const next = [...prev, hitIndex];
//           return next;
//         });
//       }, 500);
//     }
//   }, [dragging, openedDoors]);
//
//   ... (JSX omitted — see git history / previous version)
// }

// settings.winningDoorCount of DOOR_COUNT doors are winners, picked fresh on
// every mount (no persistence — refresh gets new positions, per "no session
// bound" + "randomize win position" instructions). One key drop resolves the
// game: hit any winner and it shows the win message; miss and the door you
// picked AND all the real winning doors get revealed, so you see where they
// were.
export default function GamifyPage() {
  const { settings, loading: settingsLoading } = useGamifySettings();
  const [lockUntil, setLockUntil] = useState(() => readLockUntil());
  const [goldFlakes] = useState(() => Array.from({ length: GOLD_FLAKE_COUNT }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    size: 2 + Math.random() * 2.5, // was 4-9px, halved to 2-4.5px per user request
    duration: 9 + Math.random() * 10,
    delay: -Math.random() * 15, // negative delay starts each flake mid-fall, so they're already scattered on first paint instead of all starting at the top together
    drift: (Math.random() - 0.5) * 80,
  })));
  const [winningDoors, setWinningDoors] = useState([]); // picked once settings finish loading, see effect below
  const [result, setResult] = useState(null); // null | { chosenDoor, won }
  const [winnerRevealed, setWinnerRevealed] = useState(false); // lose case only — true once the real winning doors have had their own delayed reveal
  const [dragging, setDragging] = useState(false);
  const [openingDoors, setOpeningDoors] = useState([]); // indices mid-"pop" animation
  const [keyDropped, setKeyDropped] = useState(false); // true the instant a valid drop lands, before result resolves
  // 2026-09-22: was incremented inside the delayed auto-advance reset, which
  // meant it (and the "exhausted" flag derived from it) lagged behind by one
  // round — the very last legitimate round's own reset already bumped the
  // count to the max, so the "You've used all your attempts" message showed
  // BEFORE that round's key had a chance to hide, letting one extra drag
  // sneak in. Kept here, commented out, as a record of the old timing.
  // const [playAgainCount, setPlayAgainCount] = useState(0);
  const [roundsPlayed, setRoundsPlayed] = useState(0); // incremented the instant each round's result is known (in handlePointerUp), not on the delayed reset — keeps it and playAgainExhausted in sync with the round that just finished

  const keyRef = useRef(null);
  const doorRefs = useRef([]);
  const dragStart = useRef({ x: 0, y: 0 });

  const [ribbons, setRibbons] = useState([]); // screen-wide celebration burst, win only

  // Pick the winning doors once settings finish loading (not eagerly at
  // mount) so this uses the real, SuperAdmin-configured winningDoorCount
  // instead of racing ahead of it with the hook's synchronous default.
  useEffect(() => {
    if (!settingsLoading) {
      setWinningDoors(pickWinningDoors(settings.winningDoorCount));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoading]);

  const played = result != null;

  // Ribbon blast fires once, right when the win reveals (not on the delayed
  // "here's where it was" reveal after a miss — that's not a win).
  useEffect(() => {
    if (!played || !result.won) return;
    const burst = Array.from({ length: RIBBON_COUNT }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      color: RIBBON_COLORS[Math.floor(Math.random() * RIBBON_COLORS.length)],
      drift: (Math.random() - 0.5) * 240,
      spin: (Math.random() - 0.5) * 720,
      delay: Math.random() * 0.3,
      duration: 1.4 + Math.random() * 0.6,
    }));
    setRibbons(burst);
    const t = window.setTimeout(() => setRibbons([]), 2200);
    return () => window.clearTimeout(t);
  }, [played, result]);
  // Wait for the full reveal (including the delayed winning-door reveal on a
  // miss) before advancing — otherwise the auto-advance below could interrupt
  // the reveal the user just triggered.
  const sequenceComplete = played && (result.won || winnerRevealed);
  // Total allowed plays = 1 free first play + maxPlayAgain replays. Both
  // derived from roundsPlayed, which already includes the round that just
  // resolved — see the state comment above for why this replaced the old
  // "increment on delayed reset" timing.
  const attemptsLeft = Math.max(0, settings.maxPlayAgain + 1 - roundsPlayed);
  const playAgainExhausted = roundsPlayed >= settings.maxPlayAgain + 1;
  const isLocked = lockUntil != null && Date.now() < lockUntil;

  // Sets the cooldown the instant plays run out — one popup, right here, not
  // on every later reload while still locked (guarded by lockUntil already
  // being null: this only runs on the transition into exhaustion).
  useEffect(() => {
    if (!playAgainExhausted || lockUntil != null) return;
    const until = Date.now() + settings.sessionLockHours * 60 * 60 * 1000;
    writeLockUntil(until);
    setLockUntil(until);
    toast('See you tomorrow!');
  }, [playAgainExhausted, lockUntil, settings.sessionLockHours]);

  // Keeps the countdown text fresh and clears the lock automatically once it
  // expires, without needing a manual refresh. `tick` only exists to force a
  // re-render each minute — setLockUntil(v => v) wouldn't do it, since React
  // bails out of re-rendering when a state updater returns the same value.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (lockUntil == null) return;
    const i = window.setInterval(() => {
      if (Date.now() >= lockUntil) {
        setLockUntil(null);
        window.clearInterval(i);
      } else {
        setTick((n) => n + 1);
      }
    }, 60000);
    return () => window.clearInterval(i);
  }, [lockUntil]);

  // 2026-09-22: manual "Play Again" button removed per user request — the
  // next attempt now loads itself automatically a couple seconds after each
  // reveal finishes, continuing until maxPlayAgain runs out. Old manual
  // handler kept here, commented out, in case a click-to-continue button
  // comes back.
  // const handlePlayAgain = useCallback(() => {
  //   setPlayAgainCount((c) => c + 1);
  //   setWinningDoors(pickWinningDoors(settings.winningDoorCount));
  //   setResult(null);
  //   setWinnerRevealed(false);
  //   setOpeningDoors([]);
  //   setKeyDropped(false);
  // }, [settings.winningDoorCount]);

  useEffect(() => {
    if (!sequenceComplete || playAgainExhausted) return;
    // Equalize total round time (drop → next attempt) at ~4000ms for both
    // outcomes. A loss's reveal sequence already spends 1500ms more than a
    // win's before sequenceComplete even flips true (1000ms suspense +
    // 500ms winning-doors pop, see handlePointerUp), so its post-reveal
    // pause here is trimmed by that same 1500ms: win 3500ms (500+3500=4000),
    // lose 2000ms (500+1000+500+2000=4000).
    // Win's 3500ms stays comfortably longer than the ribbon blast's own
    // 2200ms cleanup timer above, so that timer always fires and clears
    // `ribbons` naturally before this resets the round — if shortened below
    // ~2200ms, this effect's own reset (changing `result`) reruns the
    // ribbon effect and cancels its pending cleanup early, which is
    // harmless (ribbons have already faded out visually) but leaves stale
    // entries in state.
    const pauseMs = result.won ? 3500 : 2000;
    const t = window.setTimeout(() => {
      // roundsPlayed no longer increments here — see its declaration above.
      setWinningDoors(pickWinningDoors(settings.winningDoorCount));
      setResult(null);
      setWinnerRevealed(false);
      setOpeningDoors([]);
      setKeyDropped(false);
    }, pauseMs);
    return () => window.clearTimeout(t);
  }, [sequenceComplete, playAgainExhausted, settings.winningDoorCount, result]);

  const handlePointerDown = useCallback((e) => {
    if (played) return;
    const key = keyRef.current;
    if (!key) return;
    key.setPointerCapture(e.pointerId);
    dragStart.current = { x: e.clientX, y: e.clientY };
    setDragging(true);
  }, [played]);

  const handlePointerMove = useCallback((e) => {
    if (!dragging) return;
    const key = keyRef.current;
    if (!key) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    key.style.transform = `translate(${dx}px, ${dy}px)`;
  }, [dragging]);

  const handlePointerUp = useCallback((e) => {
    if (!dragging) return;
    setDragging(false);
    const key = keyRef.current;

    let hitIndex = -1;
    doorRefs.current.forEach((el, i) => {
      if (hitIndex !== -1) return;
      const rect = el?.getBoundingClientRect();
      if (
        rect &&
        e.clientX >= rect.left && e.clientX <= rect.right &&
        e.clientY >= rect.top && e.clientY <= rect.bottom
      ) {
        hitIndex = i;
      }
    });

    if (hitIndex !== -1) {
      // Valid drop — hide the key right where it landed. Previously this
      // reset key.style.transform to '' here, which (with the key's own
      // transition) visibly snapped it back to its resting spot for a beat
      // before it disappeared — the "jerk" the user was seeing. Hiding it
      // immediately via keyDropped skips that snap-back entirely.
      setKeyDropped(true);
      const won = winningDoors.includes(hitIndex);
      setOpeningDoors([hitIndex]);
      window.setTimeout(() => {
        setOpeningDoors([]);
        setResult({ chosenDoor: hitIndex, won });
        // Counts this round the moment its result is known, not later when
        // the delayed auto-advance reset happens — see roundsPlayed's
        // declaration for why that lag caused a stale-message bug.
        setRoundsPlayed((c) => c + 1);
        if (!won) {
          // Reveal "Better Luck" first, then the real winning doors a beat
          // later — not both at once — per user request.
          window.setTimeout(() => {
            setOpeningDoors(winningDoors);
            window.setTimeout(() => {
              setOpeningDoors([]);
              setWinnerRevealed(true);
            }, 500);
          }, 1000);
        }
      }, 500);
    } else if (key) {
      // Missed every door — snap back to the resting position (this is the
      // one case where the transition-driven snap-back is the right call).
      key.style.transform = '';
    }
  }, [dragging, winningDoors]);

  if (settingsLoading) {
    return (
      <div className="gamify-page gamify-page--centered">
        <GoldFlakes flakes={goldFlakes} />
        <div className="spinner" />
      </div>
    );
  }

  if (!settings.enabled) {
    return (
      <div className="gamify-page gamify-page--centered">
        <GoldFlakes flakes={goldFlakes} />
        <div className="card gamify-disabled-card">
          <div className="card-body">
            <Lock size={28} className="gamify-disabled-icon" />
            <h1 className="gamify-title gamify-title--plain">{settings.gameTitle}</h1>
            <p className="gamify-subtitle gamify-subtitle--tight">Not available right now — check back soon!</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="gamify-page gamify-page--centered">
        <GoldFlakes flakes={goldFlakes} />
        <div className="card gamify-disabled-card">
          <div className="card-body">
            <Lock size={28} className="gamify-disabled-icon" />
            <h1 className="gamify-title gamify-title--plain">{settings.gameTitle}</h1>
            <p className="gamify-subtitle gamify-subtitle--tight">
              See you tomorrow! Come back in {formatRemaining(lockUntil)}.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="gamify-page">
      <GoldFlakes flakes={goldFlakes} />
      {ribbons.length > 0 && (
        <div className="gamify-ribbon-blast" aria-hidden="true">
          {ribbons.map((r) => (
            <div
              key={r.id}
              className="gamify-ribbon"
              style={{
                left: `${r.left}%`,
                background: r.color,
                '--drift': `${r.drift}px`,
                '--spin': `${r.spin}deg`,
                animationDelay: `${r.delay}s`,
                animationDuration: `${r.duration}s`,
              }}
            />
          ))}
        </div>
      )}
      <h1 className="gamify-title gamify-title--plain">{settings.gameTitle}</h1>
      <p className="gamify-subtitle">
        {!played
          ? 'Drag the key onto a door to open it.'
          : result.won
            ? settings.winMessage
            : settings.loseMessage}
      </p>

      <div className="gamify-doors">
        {Array.from({ length: DOOR_COUNT }, (_, i) => i).map((i) => {
          const isWinDoor = winningDoors.includes(i);
          // On a win, only the chosen door reveals — the other winning doors
          // stay hidden (you only get credit for the one you picked). On a
          // miss, every winning door reveals once winnerRevealed flips true.
          const revealed = played && (i === result.chosenDoor || (!result.won && isWinDoor && winnerRevealed));
          const opening = openingDoors.includes(i);
          return (
            <div
              key={i}
              ref={(el) => { doorRefs.current[i] = el; }}
              className={
                'gamify-door' +
                (revealed ? (isWinDoor ? ' gamify-door--win' : ' gamify-door--lose') : '') +
                (opening ? ' gamify-door--opening' : '')
              }
            >
              {revealed ? (
                <span className="gamify-door-surprise">{isWinDoor ? settings.winMessage : settings.loseMessage}</span>
              ) : (
                <span className="gamify-door-number">{i + 1}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Fixed-height slot so the key/hint appearing and disappearing across
          phases never shifts the attempts line below it — that line's
          position stays constant throughout. */}
      <div className="gamify-key-slot">
        {!played && !keyDropped && (
          <>
            <div
              ref={keyRef}
              className={'gamify-key' + (dragging ? ' gamify-key--dragging' : '')}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <KeyRound size={40} className="gamify-key-icon" />
            </div>
            <p className="gamify-key-hint">Pick the Key &amp; Drop on Door</p>
          </>
        )}
      </div>

      <span className="gamify-attempts-badge">
        {playAgainExhausted ? "You've used all your attempts." : `${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} left`}
      </span>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGamifySettings, SESSION_LOCK_HOURS_OPTIONS } from '../../hooks/useGamifySettings';
import { useAuditLog } from '../../hooks/useAuditLog';
import Sk from '../../components/shared/Skeleton';
import './GamifySettingsPage.css';

export default function GamifySettingsPage() {
  const { settings, loading, updateSettings } = useGamifySettings();
  const { log } = useAuditLog();

  // 2026-09-21: old shape was 9 per-door messages — replaced by a win/lose
  // pair for the single-winner mechanic. Kept commented in case that mechanic
  // comes back.
  // const [messages, setMessages] = useState(settings.surpriseMessages);
  // useEffect(() => { setMessages(settings.surpriseMessages); }, [settings.surpriseMessages]);
  const [gameTitle, setGameTitle] = useState(settings.gameTitle);
  const [winMessage, setWinMessage] = useState(settings.winMessage);
  const [loseMessage, setLoseMessage] = useState(settings.loseMessage);
  const [winningDoorCount, setWinningDoorCount] = useState(settings.winningDoorCount);
  const [maxPlayAgain, setMaxPlayAgain] = useState(settings.maxPlayAgain);
  const [sessionLockHours, setSessionLockHours] = useState(settings.sessionLockHours);
  const [savingMessages, setSavingMessages] = useState(false);
  const [savingToggle, setSavingToggle] = useState(false);

  useEffect(() => { setGameTitle(settings.gameTitle); }, [settings.gameTitle]);
  useEffect(() => { setWinMessage(settings.winMessage); }, [settings.winMessage]);
  useEffect(() => { setLoseMessage(settings.loseMessage); }, [settings.loseMessage]);
  useEffect(() => { setWinningDoorCount(settings.winningDoorCount); }, [settings.winningDoorCount]);
  useEffect(() => { setMaxPlayAgain(settings.maxPlayAgain); }, [settings.maxPlayAgain]);
  useEffect(() => { setSessionLockHours(settings.sessionLockHours); }, [settings.sessionLockHours]);

  const handleToggle = async () => {
    setSavingToggle(true);
    try {
      await updateSettings({ enabled: !settings.enabled });
      await log({ action: 'update', targetCollection: 'config', docId: 'gamify', summary: `Gamify ${!settings.enabled ? 'enabled' : 'disabled'}` });
      toast.success(!settings.enabled ? 'Gamify enabled.' : 'Gamify disabled.');
    } catch {
      toast.error('Could not update. Try again.');
    } finally {
      setSavingToggle(false);
    }
  };

  const handleSaveMessages = async (e) => {
    e.preventDefault();
    setSavingMessages(true);
    try {
      await updateSettings({ gameTitle, winMessage, loseMessage, winningDoorCount: Number(winningDoorCount), maxPlayAgain: Number(maxPlayAgain), sessionLockHours: Number(sessionLockHours) });
      await log({ action: 'update', targetCollection: 'config', docId: 'gamify', summary: `Gamify settings updated — ${winningDoorCount}/9 win chance` });
      toast.success('Saved.');
    } catch {
      toast.error('Could not save. Try again.');
    } finally {
      setSavingMessages(false);
    }
  };

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h1>Gamify — "{settings.gameTitle}"</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            1-of-9-doors reveal at /gamify — prototype, rewards are placeholder text for now.
          </p>
        </div>
      </div>

      {loading ? (
        <Sk h="220px" r="var(--radius)" />
      ) : (
        <>
          <div className="card" style={{ marginTop: '1rem' }}>
            <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0 }}>Game enabled</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
                  Off shows visitors a "not available right now" message instead of the doors.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.enabled}
                className={`toggle-switch ${settings.enabled ? 'on' : ''}`}
                onClick={handleToggle}
                disabled={savingToggle}
                title={settings.enabled ? 'Enabled — click to disable' : 'Disabled — click to enable'}
              >
                <span className="toggle-switch-knob" />
              </button>
            </div>
          </div>

          <form className="card" style={{ marginTop: '1rem' }} onSubmit={handleSaveMessages}>
            <div className="card-body">
              <h3 style={{ marginTop: 0 }}>Win chance &amp; messages</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.35rem 0 1rem' }}>
                {winningDoorCount} of the 9 doors win (random positions, reshuffled every play). The rest show the lose message.
              </p>
              <div className="form-group">
                <label className="form-label">Game title</label>
                <input
                  className="form-control"
                  value={gameTitle}
                  onChange={(e) => setGameTitle(e.target.value)}
                  maxLength={40}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Winning doors (out of 9)</label>
                <input
                  className="form-control"
                  type="number"
                  min={1}
                  max={9}
                  value={winningDoorCount}
                  onChange={(e) => setWinningDoorCount(e.target.value)}
                  style={{ maxWidth: '120px' }}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Number of "Play Again"</label>
                <input
                  className="form-control"
                  type="number"
                  min={0}
                  value={maxPlayAgain}
                  onChange={(e) => setMaxPlayAgain(e.target.value)}
                  style={{ maxWidth: '120px' }}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Session lock, once attempts run out</label>
                <select
                  className="form-control"
                  value={sessionLockHours}
                  onChange={(e) => setSessionLockHours(e.target.value)}
                  style={{ maxWidth: '160px' }}
                >
                  {SESSION_LOCK_HOURS_OPTIONS.map((h) => (
                    <option key={h} value={h}>{h} hours</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Win message</label>
                <input
                  className="form-control"
                  value={winMessage}
                  onChange={(e) => setWinMessage(e.target.value)}
                  maxLength={80}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Lose message</label>
                <input
                  className="form-control"
                  value={loseMessage}
                  onChange={(e) => setLoseMessage(e.target.value)}
                  maxLength={80}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={savingMessages}>
                <Save size={16} /> Save Messages
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}

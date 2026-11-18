import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Building2, User } from 'lucide-react';
import './RegisterMenu.css';

export default function RegisterMenu({ className = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const go = (to) => {
    setOpen(false);
    navigate(to);
  };

  return (
    <div className={`register-menu ${className}`} ref={ref}>
      <button
        type="button"
        className="register-menu-trigger"
        onClick={() => setOpen(o => !o)}
        aria-label="Register"
      >
        <UserPlus size={18} />
        <span className="register-menu-label">For Registration</span>
      </button>

      {open && (
        <div className="register-menu-dropdown">
          <button type="button" className="register-menu-item" onClick={() => go('/admin/register')}>
            <span className="register-menu-icon"><Building2 size={16} /></span>
            Register as Business
          </button>
          <button type="button" className="register-menu-item" onClick={() => go('/index/register')}>
            <span className="register-menu-icon"><User size={16} /></span>
            Register as Customer
          </button>
        </div>
      )}
    </div>
  );
}

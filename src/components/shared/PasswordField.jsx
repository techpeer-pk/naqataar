import { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';

export default function PasswordField({ value, onChange, placeholder = '••••••••', autoComplete, required, minLength }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="input-icon-wrap">
      <Lock size={16} className="input-icon" />
      <input
        className="form-control input-with-icon input-with-toggle"
        type={visible ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
      />
      <button
        type="button"
        className="input-icon-toggle"
        tabIndex={-1}
        onClick={() => setVisible(v => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

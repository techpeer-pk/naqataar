import { Copy } from 'lucide-react';
import toast from 'react-hot-toast';

// Qunjee's own bank account — advance payments (slot bookings + prepaid
// Eats orders) are collected here, not into each business's own account.
const BANK_NAME      = 'United Bank Limited';
const ACCOUNT_TITLE  = 'Qunjee';
const ACCOUNT_NUMBER = '0493378909879';
const IBAN           = 'PK47UNIL0109000378909879';

function copyValue(value, label) {
  navigator.clipboard.writeText(value);
  toast.success(`${label} copied.`);
}

function CopyRow({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <span className="bank-details-value">
        <strong>{value}</strong>
        <button type="button" className="bank-details-copy-btn"
          onClick={() => copyValue(value, label)} title={`Copy ${label}`}>
          <Copy size={12} />
        </button>
      </span>
    </div>
  );
}

export default function BankDetailsCard() {
  return (
    <div className="bank-details-card">
      <div><span>Bank</span><strong>{BANK_NAME}</strong></div>
      <div><span>Account Title</span><strong>{ACCOUNT_TITLE}</strong></div>
      <CopyRow label="Account Number" value={ACCOUNT_NUMBER} />
      <CopyRow label="IBAN" value={IBAN} />
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Receipt } from 'lucide-react';
import { useOwnBusiness } from '../../hooks/useOwnBusiness';
import { useInvoices } from '../../hooks/useInvoices';
import { invoiceRef } from '../../utils/format';
import Sk from '../../components/shared/Skeleton';
import InvoiceDetailModal from '../../components/shared/InvoiceDetailModal';
import './AppointmentsPage.css';
import { t } from '../../i18n';

function toMillis(ts) {
  if (!ts) return 0;
  return typeof ts.toMillis === 'function' ? ts.toMillis() : ts.seconds ? ts.seconds * 1000 : 0;
}
function toDateStr(ts) {
  const ms = toMillis(ts);
  return ms ? new Date(ms).toLocaleDateString() : '—';
}

// Read-only history of subscription invoices QuFree has issued this
// business — see docs/Billing-Subscription.md. Nothing here is payable
// in-app; it's a record of off-app (WhatsApp) payments SuperAdmin confirmed.
export default function InvoicesPage() {
  const { business, loading: bizLoading } = useOwnBusiness();
  const { invoices, loading, fetchByBusiness } = useInvoices();
  const [detailInvoice, setDetailInvoice] = useState(null);

  useEffect(() => {
    if (business?.id) fetchByBusiness(business.id);
  }, [business, fetchByBusiness]);

  if (bizLoading || loading) {
    return (
      <div className="admin-layout page">
        <div className="container">
          <Sk w="220px" h="2rem" mb="1rem" />
          {Array.from({ length: 3 }).map((_, i) => <Sk key={i} h="60px" r="10px" mb="0.75rem" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-layout page">
      <div className="container">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
          <Receipt size={24} color="var(--primary)" />
          <h1>{t('Invoices')}</h1>
        </div>

        {invoices.length === 0 ? (
          <div className="empty-state">
            <p>{t('No invoices yet.')}</p>
          </div>
        ) : (
          <div className="appt-table card">
            <table>
              <thead><tr><th>{t('Invoice #')}</th><th>{t('Amount')}</th><th>{t('Period')}</th><th>{t('Issued')}</th></tr></thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id} style={{ cursor: 'pointer' }} onClick={() => setDetailInvoice(inv)}>
                    <td className="booking-ref-cell">{invoiceRef(inv.id)}</td>
                    <td>PKR {Number(inv.amount || 0).toLocaleString()}</td>
                    <td>{inv.periodStart ? toDateStr(inv.periodStart) : '—'} → {toDateStr(inv.periodEnd)}</td>
                    <td>{toDateStr(inv.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <InvoiceDetailModal invoice={detailInvoice} open={!!detailInvoice} onClose={() => setDetailInvoice(null)} />
    </div>
  );
}

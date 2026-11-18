import './ShutdownScreen.css';
import { t } from '../../i18n';

export default function ShutdownScreen() {
  return (
    <div className="shutdown-screen">
      {/* <img src="/qunjee-logo.png" alt="Qunjee" className="shutdown-logo" /> */}
      {/* <img src="/qufree-logo.png" alt="Qufree" className="shutdown-logo" /> */}
      <img src="/brand/naqatar-logo.png" alt="Naqatar" className="shutdown-logo" width={900} height={620} />
      <h1>{t("We'll be back shortly")}</h1>
      {/* <p>Qunjee is temporarily unavailable for scheduled maintenance. Please check back soon.</p> */}
      <p>{t('Naqatar is temporarily unavailable for scheduled maintenance. Please check back soon.')}</p>
    </div>
  );
}

import './ShutdownScreen.css';

export default function ShutdownScreen() {
  return (
    <div className="shutdown-screen">
      {/* <img src="/qunjee-logo.png" alt="Qunjee" className="shutdown-logo" /> */}
      {/* <img src="/qufree-logo.png" alt="Qufree" className="shutdown-logo" /> */}
      <img src="/qufree-wordmark.png" alt="Qufree" className="shutdown-logo" />
      <h1>We'll be back shortly</h1>
      {/* <p>Qunjee is temporarily unavailable for scheduled maintenance. Please check back soon.</p> */}
      <p>Qufree is temporarily unavailable for scheduled maintenance. Please check back soon.</p>
    </div>
  );
}

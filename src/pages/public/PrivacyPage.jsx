import { Link } from 'react-router-dom';
import './LegalPage.css';

// 2026-11-17: rewritten for Naqatar (operated by TechPeer). The previous
// Qunjee version is kept, fully commented out, at the bottom of this file.
const LAST_UPDATED = 'November 17, 2026';

// `embedded` = rendered inside LegalModal over the signup form (no page
// chrome, title lives in the modal header); onOpenDoc switches the modal to
// the other doc instead of navigating away from the half-filled form.
export default function PrivacyPage({ embedded = false, onOpenDoc } = {}) {
  return (
    <div className={embedded ? 'legal-embedded' : 'page'}>
      <div className={embedded ? undefined : 'container legal-page'}>
        {!embedded && <Link to="/" className="legal-back">← Back to Naqatar</Link>}

        <div className="legal-header">
          {!embedded && <h1 className="legal-title">Privacy Policy</h1>}
          <p className="legal-updated">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="card legal-body">
          <section>
            <h2>1. Overview &amp; Scope</h2>
            <p>
              This Privacy Policy explains what information Naqatar — operated by TechPeer —
              collects when you find a business by its number, view business pages, book
              appointments, or register a business, and how we use, share, and protect it. It
              applies to the Naqatar website and app.
            </p>
          </section>

          <section>
            <h2>2. Information We Collect</h2>
            <ul>
              <li><strong>Business-number searches</strong> — the phone number you type into "Find a business" is used only to look up the matching business. We don't save your searches to your account.</li>
              <li><strong>Account information</strong> — name, email, and password, via Firebase Authentication, when you create a customer or business account.</li>
              <li><strong>Profile photo</strong> — an avatar image you can optionally upload to your account, stored via Firebase Storage.</li>
              <li><strong>Business information</strong> — business name, type, address, phone number, description, services, and working hours, if you register a business. The business phone number is searchable on Naqatar and shown on the business page.</li>
              <li><strong>Booking details</strong> — the name, phone number, and email you provide when booking an appointment. Bookings require you to be signed in.</li>
              <li><strong>Payment-proof screenshots</strong> — if a business pays a subscription or invoice by bank transfer, the screenshot uploaded as proof of payment is stored in our system and reviewed manually by our team.</li>
              <li><strong>Support &amp; communications</strong> — messages you send through live chat or support tickets, and correspondence over email or WhatsApp.</li>
              <li><strong>Device &amp; push data</strong> — a device push token (via Firebase Cloud Messaging) if you enable notifications, used to send booking reminders, status updates, and announcements.</li>
              <li><strong>Usage &amp; analytics data</strong> — pages visited and general usage patterns, collected via Google Analytics. Where enabled, this includes Google Signals data (aggregated age, gender, and interest categories from your Google Account) for reporting purposes. You can opt out via Google's Ad Settings at <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">adssettings.google.com</a>.</li>
              <li><strong>Crash &amp; diagnostic data</strong> — if the app encounters an error, technical details (device/browser type, operating system, app version, and the error itself) are sent to our crash-reporting tool (Sentry) so we can find and fix bugs. This does not include your name, email, or other account information.</li>
              <li><strong>Cookies &amp; local storage</strong> — used to keep you signed in and to remember app preferences on your device.</li>
            </ul>
          </section>

          <section>
            <h2>3. How We Use Information</h2>
            <p>We use the information above to:</p>
            <ul>
              <li>Find the business that matches the number you search for.</li>
              <li>Create and manage your account, and let businesses manage their listings.</li>
              <li>Process and fulfil bookings.</li>
              <li>Send booking reminders, status updates, subscription notices, and support responses.</li>
              <li>Review and confirm manual payments.</li>
              <li>Detect misuse, keep the platform secure, and respond to support requests.</li>
              <li>Understand overall usage so we can improve the platform.</li>
            </ul>
          </section>

          <section>
            <h2>4. Who We Share It With</h2>
            <p>We don't sell your personal information. We share it only with:</p>
            <ul>
              <li><strong>The specific business</strong> you book with — so they can serve you.</li>
              <li><strong>Service providers</strong> that run the platform on our behalf: Google Firebase (authentication, database, file storage, hosting, push notifications), Google Analytics (usage analytics), Sentry (crash reporting), and EmailJS (booking confirmation emails).</li>
              <li><strong>Our own support and oversight staff</strong> (support console and SuperAdmin) — who can look up account and booking records to resolve support requests and operate the platform. Access is role-based and limited to what each role needs.</li>
              <li><strong>Authorities</strong>, where required by law or to protect the rights, safety, or property of Naqatar, our users, or the public.</li>
            </ul>
            <p>
              Advertisers whose ads appear on Naqatar (labeled "Sponsored") do not receive your
              personal information from us.
            </p>
          </section>

          <section>
            <h2>5. Data Retention</h2>
            <p>
              We keep account and booking records for as long as your account is active and for a
              reasonable period after, to meet legal, accounting, and dispute-resolution needs.
              Payment-proof screenshots are kept only as long as needed to verify and reconcile
              the related payment.
            </p>
          </section>

          <section>
            <h2>6. Your Rights</h2>
            <p>
              You can review and update most of your account and business information directly
              from your profile pages. Customer accounts can delete their account directly from
              Profile → Delete My Account, no need to contact us first — this removes your login
              and profile immediately; booking records tied to it are retained as described in
              Section 5. For business accounts, to delete that booking history too, or to request
              {/* a copy of your data or ask us to correct it, contact us through the{' '}
              <strong>Help</strong> / support chat in the app. We'll respond and action verified */}
              a copy of your data or ask us to correct it, email us at{' '}
              <a href="mailto:techpeer.pk@gmail.com">techpeer.pk@gmail.com</a> or use the{' '}
              <strong>Help</strong> / support chat in the app. We'll respond and action verified
              requests within a reasonable time, subject to any records we're required to keep by
              law.
            </p>
          </section>

          <section>
            <h2>7. Security</h2>
            <p>
              We rely on Firebase's authentication and access-control infrastructure, and
              role-based rules that limit who can read or write which data, to protect your
              information. No online system is 100% secure, and we can't guarantee absolute
              security.
            </p>
          </section>

          <section>
            <h2>8. Children's Privacy</h2>
            <p>
              Naqatar is not directed at children under 13, and business accounts require the
              registrant to be at least 18. We don't knowingly collect personal information from
              children under 13; if you believe a child has provided us information, contact us
              and we'll remove it.
            </p>
          </section>

          <section>
            <h2>9. International Data Transfers</h2>
            <p>
              Our service providers (Firebase, Google Analytics, Sentry) may store and process data
              on servers located outside Pakistan. By using Naqatar, you understand your information
              may be processed in other countries with different data protection laws.
            </p>
          </section>

          <section>
            <h2>10. Third-Party Links &amp; Ads</h2>
            <p>
              Naqatar may link to third-party sites, including advertisers' sites. Their privacy
              practices are governed by their own privacy policies, not this one.
            </p>
          </section>

          <section>
            <h2>11. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Material changes will be
              reflected by updating the "Last updated" date above. Continued use of Naqatar after a
              change means you accept the updated policy. See also our{' '}
              {embedded
                ? <a href="/terms" onClick={e => { e.preventDefault(); onOpenDoc?.('terms'); }}>Terms of Service</a>
                : <Link to="/terms">Terms of Service</Link>}.
            </p>
          </section>

          <section>
            <h2>12. Contact Us</h2>
            <p>
              Naqatar, operated by TechPeer — Karachi, Pakistan<br />
              {/* The quickest way to reach us is the <strong>Help</strong> / support chat inside the app. */}
              Email: <a href="mailto:techpeer.pk@gmail.com">techpeer.pk@gmail.com</a><br />
              You can also use the <strong>Help</strong> / support chat inside the app.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PREVIOUS VERSION (Qunjee, last updated September 18, 2026) — kept for
// reference, fully commented out. Replaced 2026-11-17 by the Naqatar text above.
// ═══════════════════════════════════════════════════════════════════
// import { Link } from 'react-router-dom';
// import './LegalPage.css';
//
// const LAST_UPDATED = 'September 18, 2026';
//
// // `embedded` = rendered inside LegalModal over the signup form (no page
// // chrome, title lives in the modal header); onOpenDoc switches the modal to
// // the other doc instead of navigating away from the half-filled form.
// // export default function PrivacyPage() {
// export default function PrivacyPage({ embedded = false, onOpenDoc } = {}) {
//   return (
//     // <div className="page">
//     //   <div className="container legal-page">
//     //     <Link to="/index" className="legal-back">← Back to Qunjee</Link>
//     <div className={embedded ? 'legal-embedded' : 'page'}>
//       <div className={embedded ? undefined : 'container legal-page'}>
//         {!embedded && <Link to="/index" className="legal-back">← Back to Qunjee</Link>}
//
//         <div className="legal-header">
//           {/* <h1 className="legal-title">Privacy Policy</h1> */}
//           {!embedded && <h1 className="legal-title">Privacy Policy</h1>}
//           <p className="legal-updated">Last updated: {LAST_UPDATED}</p>
//         </div>
//
//         <div className="card legal-body">
//           <section>
//             <h2>1. Overview &amp; Scope</h2>
//             <p>
//               This Privacy Policy explains what information Qunjee collects across its service
//               categories — Restaurants (table booking &amp; food ordering), Entertainment
//               (appointment booking for venues such as padel courts), Travel (hotel/resort room
//               reservations), HealthCare (clinic &amp; at-home health services), Salon &amp;
//               Personal Care, Wedding (attire rental, photography, catering, and more), and
//               Education — and how we use, share, and protect it. It applies to this app and does
//               not cover other Qunjee-branded sites such as qunjee.com, which have their own
//               privacy policy.
//             </p>
//           </section>
//
//           <section>
//             <h2>2. Information We Collect</h2>
//             <ul>
//               <li><strong>Account information</strong> — name, email, and password, via Firebase Authentication, when you create a customer or business account.</li>
//               <li><strong>Profile photo</strong> — an avatar image you can optionally upload to your account, stored via Firebase Storage.</li>
//               <li><strong>Business information</strong> — business name, type, address, phone number, description, services, menu items, and working hours, if you register a business.</li>
//               <li><strong>Booking &amp; order details</strong> — the name, phone number, and email you provide when booking an appointment, reserving a room, or placing an order. Appointment and room bookings require you to be signed in; a QunjeeEats food order can be placed as a guest without an account unless the vendor requires advance payment.</li>
//               <li><strong>Payment-proof screenshots</strong> — if you pay a subscription, invoice, or a prepaid QunjeeEats order by bank transfer, the screenshot you upload as proof of payment is stored in our system and reviewed manually by our team.</li>
//               <li><strong>Support &amp; communications</strong> — messages you send through live chat or support tickets, and correspondence over email or WhatsApp.</li>
//               <li><strong>Device &amp; push data</strong> — a device push token (via Firebase Cloud Messaging) if you enable notifications, used to send booking reminders, order status updates, and announcements.</li>
//               <li><strong>Usage &amp; analytics data</strong> — pages visited and general usage patterns, collected via Google Analytics. Where enabled, this includes Google Signals data (aggregated age, gender, and interest categories from your Google Account) for reporting purposes. You can opt out via Google's Ad Settings at <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">adssettings.google.com</a>.</li>
//               <li><strong>Crash &amp; diagnostic data</strong> — if the app encounters an error, technical details (device/browser type, operating system, app version, and the error itself) are sent to our crash-reporting tool (Sentry) so we can find and fix bugs. This does not include your name, email, or other account information.</li>
//               <li><strong>Cookies &amp; local storage</strong> — used to keep you signed in and to remember your QunjeeEats cart between visits.</li>
//             </ul>
//           </section>
//
//           <section>
//             <h2>3. How We Use Information</h2>
//             <p>We use the information above to:</p>
//             <ul>
//               <li>Create and manage your account, and let businesses manage their listings.</li>
//               <li>Process and fulfil bookings, room reservations, and food orders.</li>
//               <li>Send booking reminders, order status updates, subscription notices, and support responses.</li>
//               <li>Review and confirm manual payments.</li>
//               <li>Detect misuse, keep the platform secure, and respond to support requests.</li>
//               <li>Understand overall usage so we can improve the platform.</li>
//             </ul>
//           </section>
//
//           <section>
//             <h2>4. Who We Share It With</h2>
//             <p>We don't sell your personal information. We share it only with:</p>
//             <ul>
//               <li><strong>The specific business</strong> you book an appointment, reserve a room, or place an order with — so they can serve you.</li>
//               <li><strong>Service providers</strong> that run the platform on our behalf: Google Firebase (authentication, database, file storage, hosting, push notifications), Google Analytics (usage analytics), and EmailJS (booking confirmation emails).</li>
//               <li><strong>Our own support and oversight staff</strong> (CSR/support console and SuperAdmin) — who can look up account, booking, and order records to resolve support requests and operate the platform. Access is role-based and limited to what each role needs.</li>
//               <li><strong>Authorities</strong>, where required by law or to protect the rights, safety, or property of Qunjee, our users, or the public.</li>
//             </ul>
//           </section>
//
//           <section>
//             <h2>5. Data Retention</h2>
//             <p>
//               We keep account, booking, and order records for as long as your account is active
//               and for a reasonable period after, to meet legal, accounting, and dispute-resolution
//               needs. Payment-proof screenshots are kept only as long as needed to verify and
//               reconcile the related payment.
//             </p>
//           </section>
//
//           <section>
//             <h2>6. Your Rights</h2>
//             <p>
//               You can review and update most of your account and business information directly
//               from your profile pages. Customer accounts can delete their account directly from
//               Profile → Delete My Account, no need to contact us first — this removes your login
//               and profile immediately; booking/order records tied to it are retained as described
//               in Section 5. For business accounts, to delete that booking/order history too, or to
//               request a copy of your data or ask us to correct it, contact us at{' '}
//               <a href="mailto:hello@qunjee.com">hello@qunjee.com</a>. We'll respond and action
//               verified requests within a reasonable time, subject to any records we're required
//               to keep by law.
//             </p>
//           </section>
//
//           <section>
//             <h2>7. Security</h2>
//             <p>
//               We rely on Firebase's authentication and access-control infrastructure, and
//               role-based rules that limit who can read or write which data, to protect your
//               information. No online system is 100% secure, and we can't guarantee absolute
//               security.
//             </p>
//           </section>
//
//           <section>
//             <h2>8. Children's Privacy</h2>
//             <p>
//               Qunjee is not directed at children under 13, and business accounts require the
//               registrant to be at least 18. We don't knowingly collect personal information from
//               children under 13; if you believe a child has provided us information, contact us
//               and we'll remove it.
//             </p>
//           </section>
//
//           <section>
//             <h2>9. International Data Transfers</h2>
//             <p>
//               Our service providers (Firebase, Google Analytics) may store and process data on
//               servers located outside Pakistan. By using Qunjee, you understand your information
//               may be processed in other countries with different data protection laws.
//             </p>
//           </section>
//
//           <section>
//             <h2>10. Third-Party Links</h2>
//             <p>
//               Qunjee's discovery hub links to other Qunjee-branded verticals and third-party
//               sites, including qunjee.com. Their privacy practices are governed by their own
//               privacy policies, not this one.
//             </p>
//           </section>
//
//           <section>
//             <h2>11. Changes to This Policy</h2>
//             <p>
//               We may update this Privacy Policy from time to time. Material changes will be
//               reflected by updating the "Last updated" date above. Continued use of Qunjee after a
//               change means you accept the updated policy. See also our{' '}
//               {/* <Link to="/terms">Terms of Service</Link> */}
//               {embedded
//                 ? <a href="/terms" onClick={e => { e.preventDefault(); onOpenDoc?.('terms'); }}>Terms of Service</a>
//                 : <Link to="/terms">Terms of Service</Link>}.
//             </p>
//           </section>
//
//           <section>
//             <h2>12. Contact Us</h2>
//             <p>
//               Qunjee, Plot 36-F, Block-6 PECHS, Karachi, 75400, Pakistan<br />
//               Email: <a href="mailto:hello@qunjee.com">hello@qunjee.com</a>
//             </p>
//           </section>
//         </div>
//       </div>
//     </div>
//   );
// }

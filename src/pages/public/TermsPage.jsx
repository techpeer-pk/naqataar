import { Link } from 'react-router-dom';
import './LegalPage.css';

// 2026-11-17: rewritten for Qufree (operated by TechPeer). The previous
// Qunjee version is kept, fully commented out, at the bottom of this file.
const LAST_UPDATED = 'November 17, 2026';

// `embedded` = rendered inside LegalModal over the signup form (no page
// chrome, title lives in the modal header); onOpenDoc switches the modal to
// the other doc instead of navigating away from the half-filled form.
export default function TermsPage({ embedded = false, onOpenDoc } = {}) {
  return (
    <div className={embedded ? 'legal-embedded' : 'page'}>
      <div className={embedded ? undefined : 'container legal-page'}>
        {!embedded && <Link to="/find-business" className="legal-back">← Back to Qufree</Link>}

        <div className="legal-header">
          {!embedded && <h1 className="legal-title">Terms of Service</h1>}
          <p className="legal-updated">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="card legal-body">
          <section>
            <h2>1. Acceptance of Terms</h2>
            <p>
              These Terms of Service ("Terms") govern your access to and use of Qufree — the
              website, PWA and any related apps operated by TechPeer ("Qufree", "we", "us",
              "our"). By searching for a business, creating an account, booking an appointment,
              registering a business, or otherwise using Qufree, you agree to these Terms and to
              our{' '}
              {embedded
                ? <a href="/privacy" onClick={e => { e.preventDefault(); onOpenDoc?.('privacy'); }}>Privacy Policy</a>
                : <Link to="/privacy">Privacy Policy</Link>}. If you do not agree, please do not use
              Qufree.
            </p>
          </section>

          <section>
            <h2>2. The Qufree Platform</h2>
            <p>
              Qufree lets you find a business registered on the platform by its phone number
              (its "business number") and go straight to that business's page, where you can see
              its details and services and, where the business offers it, book an appointment
              online.
            </p>
            <p>
              Businesses on Qufree may come from many fields — for example restaurants, salons
              and personal care, healthcare providers, entertainment venues, wedding services,
              travel and education. Which services and booking options are available depends on
              each business.
            </p>
          </section>

          <section>
            <h2>3. Accounts &amp; Eligibility</h2>
            <p>
              You can search for businesses and view their pages without an account. Completing
              a booking requires signing in first; this confirms it's really you and helps
              prevent fake or prank bookings. A customer account also lets you track your
              bookings and notifications in one place. Registering a business account requires
              that you are at least 18 years old and authorized to act on behalf of the business
              you register.
            </p>
            <p>
              You are responsible for the accuracy of the information you provide and for keeping
              your login credentials confidential. You are responsible for all activity that
              happens under your account.
            </p>
          </section>

          <section>
            <h2>4. Business Accounts &amp; Listings</h2>
            <p>
              Business owners self-register their business, services, working hours and pricing.
              You are solely responsible for the accuracy of your listing and for honoring the
              bookings customers place through it. Qufree does not guarantee bookings or revenue
              to any business.
            </p>
            <p>
              By registering a business, you agree that the business phone number you provide is
              used to let customers find your listing on Qufree when they search for that number,
              and is shown on your business page.
            </p>
          </section>

          <section>
            <h2>5. Bookings</h2>
            <p>
              Bookings are held against live availability at the business you select; a slot is
              not guaranteed until the business accepts it. Qufree does not process card or online
              payments for bookings — any payment for the service itself is between you and the
              business.
            </p>
            <p>
              Cancellation, rescheduling and no-show handling are set by the individual business
              you're booking with, unless stated otherwise on Qufree. Separately, if a business
              does not accept or decline a pending booking within a reasonable window, Qufree may
              automatically cancel the request so the held slot becomes available to other
              customers.
            </p>
          </section>

          <section>
            <h2>6. Manual Subscription &amp; Payments</h2>
            <p>
              New business accounts get a 30-day free trial. Continued access after the trial is
              arranged manually — typically over WhatsApp — and activated by our team once
              payment is confirmed. Qufree does not run automatic recurring billing.
            </p>
            <p>
              Where payment is made by bank transfer, you may be asked to upload a screenshot as
              proof of payment. You are responsible for making sure any screenshot you upload
              does not expose more information than necessary (e.g. crop out unrelated account
              details) beyond what's needed to confirm the transaction.
            </p>
          </section>

          <section>
            <h2>7. Advertising &amp; Sponsored Content</h2>
            <p>
              Qufree may show advertisements, including banners and rotating ads. Advertising is
              labeled "Sponsored". Advertisers are responsible for their own ads, offers and
              websites; an ad on Qufree is not an endorsement, and any dealing with an advertiser
              is between you and that advertiser.
            </p>
          </section>

          <section>
            <h2>8. Prohibited Conduct</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Provide false information when registering, searching or booking.</li>
              <li>Use Qufree for any unlawful purpose or to harass another user or business.</li>
              <li>Attempt to access another user's or business's account or data without authorization.</li>
              <li>Use the business-number search in bulk or by automated means, or to collect business contact details.</li>
              <li>Scrape, reverse-engineer, or interfere with the normal operation of Qufree.</li>
              <li>Upload content that infringes someone else's rights or contains malware.</li>
            </ul>
          </section>

          <section>
            <h2>9. Notifications &amp; Communications</h2>
            <p>
              We may contact you by email, push notification, or WhatsApp regarding your bookings,
              account, or subscription — including booking reminders, status updates, and service
              announcements. You can manage push notification permissions through your device or
              browser settings.
            </p>
          </section>

          <section>
            <h2>10. Intellectual Property</h2>
            <p>
              The Qufree name, logo, and platform design are owned by TechPeer. Business owners
              retain ownership of the content they upload (photos, descriptions, service details)
              but grant Qufree a license to display it on the platform as part of the listing.
            </p>
          </section>

          <section>
            <h2>11. Third-Party Links</h2>
            <p>
              Qufree may link to third-party sites, including advertisers' sites. We are not
              responsible for the content, terms, or privacy practices of sites we don't operate.
            </p>
          </section>

          <section>
            <h2>12. Disclaimers &amp; Limitation of Liability</h2>
            <p>
              Qufree is provided "as is". We do our best to keep business information and
              availability accurate and the service reliable, but we don't guarantee uninterrupted
              access, that every search will find a business, or that every booking will be
              fulfilled exactly as requested — that responsibility sits with the individual
              business. To the fullest extent permitted by law, Qufree is not liable for indirect,
              incidental, or consequential damages arising from your use of the platform.
            </p>
          </section>

          <section>
            <h2>13. Termination</h2>
            <p>
              We may suspend or terminate access to an account that violates these Terms, engages
              in fraudulent activity, or misuses the platform. You may stop using Qufree, or ask
              us to close your account, at any time by contacting us.
            </p>
          </section>

          <section>
            <h2>14. Governing Law</h2>
            <p>
              These Terms are governed by the laws of Pakistan. Any dispute arising from these
              Terms or your use of Qufree is subject to the exclusive jurisdiction of the courts
              of Karachi, Pakistan.
            </p>
          </section>

          <section>
            <h2>15. Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time. Material changes will be reflected by
              updating the "Last updated" date above. Continued use of Qufree after a change means
              you accept the updated Terms.
            </p>
          </section>

          <section>
            <h2>16. Contact Us</h2>
            <p>
              Qufree, operated by TechPeer — Karachi, Pakistan<br />
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
// reference, fully commented out. Replaced 2026-11-17 by the Qufree text above.
// ═══════════════════════════════════════════════════════════════════
// import { Link } from 'react-router-dom';
// import './LegalPage.css';
//
// const LAST_UPDATED = 'September 18, 2026';
//
// // `embedded` = rendered inside LegalModal over the signup form (no page
// // chrome, title lives in the modal header); onOpenDoc switches the modal to
// // the other doc instead of navigating away from the half-filled form.
// // export default function TermsPage() {
// export default function TermsPage({ embedded = false, onOpenDoc } = {}) {
//   return (
//     // <div className="page">
//     //   <div className="container legal-page">
//     //     <Link to="/index" className="legal-back">← Back to Qunjee</Link>
//     <div className={embedded ? 'legal-embedded' : 'page'}>
//       <div className={embedded ? undefined : 'container legal-page'}>
//         {!embedded && <Link to="/index" className="legal-back">← Back to Qunjee</Link>}
//
//         <div className="legal-header">
//           {/* <h1 className="legal-title">Terms of Service</h1> */}
//           {!embedded && <h1 className="legal-title">Terms of Service</h1>}
//           <p className="legal-updated">Last updated: {LAST_UPDATED}</p>
//         </div>
//
//         <div className="card legal-body">
//           <section>
//             <h2>1. Acceptance of Terms</h2>
//             <p>
//               These Terms of Service ("Terms") govern your access to and use of Qunjee — the
//               website, PWA and any related apps operated by Qunjee ("Qunjee", "we", "us", "our").
//               By creating an account, booking an appointment, placing an order, registering a
//               business, or otherwise using Qunjee, you agree to these Terms and to our{' '}
//               {/* <Link to="/privacy">Privacy Policy</Link> */}
//               {embedded
//                 ? <a href="/privacy" onClick={e => { e.preventDefault(); onOpenDoc?.('privacy'); }}>Privacy Policy</a>
//                 : <Link to="/privacy">Privacy Policy</Link>}. If you do not agree, please do not use
//               Qunjee.
//             </p>
//           </section>
//
//           <section>
//             <h2>2. The Qunjee Platform</h2>
//             <p>
//               Qunjee is organized around a set of service categories. The categories currently
//               available are:
//             </p>
//             <ul>
//               <li><strong>Restaurants</strong> — table booking and food ordering (delivery, self-pickup, or dine-in) from local restaurants.</li>
//               <li><strong>Entertainment</strong> — appointment booking for entertainment venues such as padel courts.</li>
//               <li><strong>Travel</strong> — date-range hotel and resort room reservations.</li>
//               <li><strong>HealthCare</strong> — clinic appointments and at-home health services (doctor visits, blood tests, X-rays, physiotherapy, medicine consultancy) from listed providers.</li>
//               <li><strong>Salon &amp; Personal Care</strong> — salon and aesthetic-clinic appointment booking.</li>
//               <li><strong>Wedding</strong> — attire rental, photography/videography, catering, at-home makeup, wedding car rental, and event management.</li>
//               <li><strong>Education</strong> — study-abroad consultation, with more services planned.</li>
//             </ul>
//             <p>
//               Qunjee also operates other lifestyle verticals reachable from our discovery hub
//               (e.g. Dekhbaal, Qunjee Estates) that live on qunjee.com. Those verticals are
//               governed by qunjee.com's own terms and policies, not this document.
//             </p>
//           </section>
//
//           <section>
//             <h2>3. Accounts &amp; Eligibility</h2>
//             <p>
//               You can always browse without an account. Completing an appointment or room
//               booking — Restaurants, Travel, HealthCare, Salon &amp; Personal Care, or Wedding —
//               requires signing in first; this confirms it's really you and helps prevent fake or
//               prank bookings.
//               Placing a QunjeeEats food order does not require an account, unless the vendor
//               requires advance payment (or you're pre-ordering ahead of a dine-in reservation), in
//               which case you'll be asked to sign in so the payment proof can be tied to your
//               account. Creating a customer account, where not already required to complete a
//               booking, lets you track your bookings and orders in one place. Registering a
//               business account requires that you are at least 18 years old and authorized to act
//               on behalf of the business you register.
//             </p>
//             <p>
//               You are responsible for the accuracy of the information you provide and for keeping
//               your login credentials confidential. You are responsible for all activity that
//               happens under your account.
//             </p>
//           </section>
//
//           <section>
//             <h2>4. Business Accounts &amp; Listings</h2>
//             <p>
//               Business owners self-register their business, services, menus, working hours and
//               pricing. You are solely responsible for the accuracy of your listing and for
//               honoring the bookings and orders customers place through it. Qunjee does not
//               guarantee bookings, orders, or revenue to any business.
//             </p>
//           </section>
//
//           <section>
//             <h2>5. Bookings &amp; Orders</h2>
//             <p>
//               Appointment and room bookings across every category — Restaurants, Entertainment,
//               Travel, HealthCare, Salon &amp; Personal Care, Wedding — are held against live
//               availability at the business you select; a confirmed slot or room is not guaranteed
//               until the business accepts it. Restaurant food orders can be paid cash-on-delivery or
//               prepaid by bank transfer (with a payment-proof screenshot) — Qunjee does not process
//               card or online payments directly.
//             </p>
//             <p>
//               Cancellation, rescheduling and no-show handling are set by the individual business
//               you're booking or ordering from, unless stated otherwise on Qunjee. Separately, if a
//               business does not accept or decline a pending appointment or room booking within a
//               reasonable window, Qunjee may automatically cancel the request so the held slot
//               becomes available to other customers.
//             </p>
//           </section>
//
//           <section>
//             <h2>6. Manual Subscription &amp; Payments</h2>
//             <p>
//               New business accounts get a 30-day free trial. Continued access after the trial is
//               arranged manually — typically over WhatsApp — and activated by our team once
//               payment is confirmed. Qunjee does not run automatic recurring billing.
//             </p>
//             <p>
//               Where payment is made by bank transfer, you may be asked to upload a screenshot as
//               proof of payment. You are responsible for making sure any screenshot you upload
//               does not expose more information than necessary (e.g. crop out unrelated account
//               details) beyond what's needed to confirm the transaction.
//             </p>
//           </section>
//
//           <section>
//             <h2>7. Prohibited Conduct</h2>
//             <p>You agree not to:</p>
//             <ul>
//               <li>Provide false information when registering, booking or ordering.</li>
//               <li>Use Qunjee for any unlawful purpose or to harass another user or business.</li>
//               <li>Attempt to access another user's or business's account or data without authorization.</li>
//               <li>Scrape, reverse-engineer, or interfere with the normal operation of Qunjee.</li>
//               <li>Upload content that infringes someone else's rights or contains malware.</li>
//             </ul>
//           </section>
//
//           <section>
//             <h2>8. Notifications &amp; Communications</h2>
//             <p>
//               We may contact you by email, push notification, or WhatsApp regarding your bookings,
//               orders, account, or subscription — including booking reminders, order status
//               updates, and service announcements. You can manage push notification permissions
//               through your device or browser settings.
//             </p>
//           </section>
//
//           <section>
//             <h2>9. Intellectual Property</h2>
//             <p>
//               The Qunjee name, logo, and platform design are owned by Qunjee. Business owners
//               retain ownership of the content they upload (photos, menus, descriptions) but grant
//               Qunjee a license to display it on the platform as part of the listing.
//             </p>
//           </section>
//
//           <section>
//             <h2>10. Third-Party Links</h2>
//             <p>
//               Qunjee's discovery hub links to other Qunjee-branded verticals and to third-party
//               sites. We are not responsible for the content, terms, or privacy practices of sites
//               we don't operate, including qunjee.com.
//             </p>
//           </section>
//
//           <section>
//             <h2>11. Disclaimers &amp; Limitation of Liability</h2>
//             <p>
//               Qunjee is provided "as is". We do our best to keep availability accurate and
//               transactions reliable, but we don't guarantee uninterrupted access or that every
//               booking or order will be fulfilled exactly as requested — that responsibility sits
//               with the individual business. To the fullest extent permitted by law, Qunjee is not
//               liable for indirect, incidental, or consequential damages arising from your use of
//               the platform.
//             </p>
//           </section>
//
//           <section>
//             <h2>12. Termination</h2>
//             <p>
//               We may suspend or terminate access to an account that violates these Terms, engages
//               in fraudulent activity, or misuses the platform. You may stop using Qunjee, or ask
//               us to close your account, at any time by contacting us.
//             </p>
//           </section>
//
//           <section>
//             <h2>13. Governing Law</h2>
//             <p>
//               These Terms are governed by the laws of Pakistan. Any dispute arising from these
//               Terms or your use of Qunjee is subject to the exclusive jurisdiction of the courts
//               of Karachi, Pakistan.
//             </p>
//           </section>
//
//           <section>
//             <h2>14. Changes to These Terms</h2>
//             <p>
//               We may update these Terms from time to time. Material changes will be reflected by
//               updating the "Last updated" date above. Continued use of Qunjee after a change means
//               you accept the updated Terms.
//             </p>
//           </section>
//
//           <section>
//             <h2>15. Contact Us</h2>
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

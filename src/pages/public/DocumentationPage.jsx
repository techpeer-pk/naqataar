import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Mail } from 'lucide-react';
import './DocumentationPage.css';

const SECTIONS = [
  { id: 'what-qunjee-is',         label: 'What Qunjee Is' },
  { id: 'ecosystem-at-a-glance',  label: 'Ecosystem at a Glance' },
  { id: 'how-it-works',           label: 'How It Works' },
  { id: 'verticals',              label: 'Categories — Deep Dive' },
  { id: 'for-business-owners',    label: 'For Business Owners' },
  { id: 'for-customers',          label: 'For Customers' },
  { id: 'roles',                  label: 'Roles in the Platform' },
  { id: 'trust-reliability',      label: 'Trust & Reliability' },
  { id: 'notifications-support',  label: 'Notifications & Support' },
  { id: 'platform-availability',  label: 'Platform & Availability' },
  { id: 'brand-identity',         label: 'Brand Identity' },
  { id: 'contact',                label: 'Contact / Get in Touch' },
];

export default function DocumentationPage() {
  const [activeId, setActiveId] = useState(SECTIONS[0].id);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Scroll-spy — no existing pattern in this codebase to reuse, so this is
  // fresh. rootMargin biases toward the top third of the viewport so a
  // section is marked "active" once its heading has scrolled just past the
  // sticky navbar, not only once it's dead-center.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        });
      },
      { rootMargin: '-15% 0px -70% 0px', threshold: 0 },
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="doc-page">
      {drawerOpen && <div className="doc-backdrop" onClick={() => setDrawerOpen(false)} />}

      <button
        type="button"
        className="doc-menu-toggle"
        onClick={() => setDrawerOpen((o) => !o)}
        aria-label="Table of contents"
      >
        <Menu size={18} /> Contents
      </button>

      <aside className={`doc-sidebar${drawerOpen ? ' open' : ''}`}>
        <div className="doc-sidebar-head">
          <span className="doc-sidebar-title">Documentation</span>
          <button
            type="button"
            className="doc-sidebar-close"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <nav className="doc-toc">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={`doc-toc-link${activeId === s.id ? ' active' : ''}`}
              onClick={() => setDrawerOpen(false)}
            >
              {s.label}
            </a>
          ))}
        </nav>
        <Link to="/index" className="doc-back">← Back to Qunjee</Link>
      </aside>

      <main className="doc-content">
        <div className="doc-content-inner">
          <header className="doc-hero">
            <h1>Qunjee Documentation</h1>
            <p>
              A complete, plain-language guide to how the Qunjee platform works —
              every vertical and every role, in one place.
            </p>
          </header>

          <section id="what-qunjee-is">
            <h2>1. What Qunjee Is</h2>
            <p>
              Qunjee is a single platform that brings appointment booking, room
              reservations, and food ordering together for a wide range of local
              businesses — restaurants, salons, clinics, padel courts, hotels,
              at-home health providers, attire rental, and photography studios.
              Instead of a different app or number for every business you deal
              with, Qunjee gives customers one place to discover, book, and order,
              and gives business owners one dashboard to manage everything a
              customer does with them.
            </p>
          </section>

          <section id="ecosystem-at-a-glance">
            <h2>2. Ecosystem at a Glance</h2>
            <p>Every category currently live on Qunjee, at a glance:</p>
            <div className="doc-grid">
              <div className="doc-grid-card card">
                <h3>Restaurants</h3>
                <p>Book a table, and order food for delivery, self-pickup, or dine-in.</p>
              </div>
              <div className="doc-grid-card card">
                <h3>Travel</h3>
                <p>Date-range hotel and resort room reservations — check-in and check-out, not a single time slot.</p>
              </div>
              <div className="doc-grid-card card">
                <h3>HealthCare</h3>
                <p>Clinic appointments plus at-home health services — doctor visits, lab tests, and similar, booked at your door.</p>
              </div>
              <div className="doc-grid-card card">
                <h3>Salon &amp; Personal Care</h3>
                <p>Salon and aesthetic-clinic appointment booking.</p>
              </div>
              <div className="doc-grid-card card">
                <h3>Wedding</h3>
                <p>Attire rental, photography/videography, caterers, at-home makeup, and wedding car rental.</p>
              </div>
              <div className="doc-grid-card card">
                <h3>Education</h3>
                <p>Study-abroad consultation, with more services planned.</p>
              </div>
            </div>
          </section>

          <section id="how-it-works">
            <h2>3. How It Works</h2>
            <ol className="doc-steps">
              <li>
                <strong>Discover</strong> — the homepage opens on 6 categories
                (Restaurants, Travel, HealthCare, Salon &amp; Personal Care,
                Wedding, Education); each one opens a short list of specific
                services before you land on an actual business or vendor
                listing. No account is required just to look around.
              </li>
              <li>
                <strong>Book or order</strong> — pick a time slot, a room and a
                date range, or put together a food order.
              </li>
              <li>
                <strong>Get confirmed</strong> — the business confirms your
                booking, or your order starts moving through preparation right
                away.
              </li>
              <li>
                <strong>Visit or receive</strong> — show up for your appointment
                or stay, or get your order delivered, picked up, or served at
                your table.
              </li>
            </ol>
          </section>

          <section id="verticals">
            <h2>4. Categories — Deep Dive</h2>

            <h3>Restaurants</h3>
            <p>
              Book a table directly, or order food with three fulfillment
              paths: delivery to your address, self-pickup from the vendor,
              or dine-in. Dine-in isn't order-only — it's tied to an actual
              table reservation, and you can place an Advance Food Order
              against that same reservation so your food starts getting
              prepared before you even arrive.
            </p>

            <h3>Travel</h3>
            <p>
              Hotel and resort room reservations by date range instead of a
              single time slot — you pick a check-in and check-out date, and
              the booking holds one room out of a limited pool for those
              nights.
            </p>

            <h3>HealthCare</h3>
            <p>
              Clinic appointments work like a normal time-slot booking; a
              business opens up time slots and you claim one. At-home
              services (doctor visits, lab tests, X-rays, physiotherapy,
              medicine consultancy) are booked the same way, for a visit to
              your door instead of a clinic.
            </p>

            <h3>Salon &amp; Personal Care</h3>
            <p>
              Time-slot booking for salons and aesthetic clinics. One
              appointment can bundle several services into a single slot
              claim (for example, a haircut and a beard trim booked
              together).
            </p>

            <h3>Wedding</h3>
            <p>
              Several services under one category: attire rental (reserved
              by date range, the same way as a hotel room), photography and
              videography, caterers, at-home makeup, wedding car rental, and
              event management.
            </p>

            <h3>Education</h3>
            <p>
              Study-abroad consultation is live today as a plain time-slot
              booking; school advisory, career counselling, and admission-test
              services are planned.
            </p>
          </section>

          <section id="for-business-owners">
            <h2>5. For Business Owners</h2>
            <p>
              Business owners self-register their business, list their
              services or menu, set working hours and pricing, and go live.
              From there, everything is managed through a dedicated business
              dashboard — incoming bookings or orders, availability, and
              account status all in one place.
            </p>
            <p>
              New business accounts get a 30-day free trial. Continued access
              after the trial is arranged manually, typically over WhatsApp,
              and activated once payment is confirmed — Qunjee does not run
              automatic recurring billing.
            </p>
          </section>

          <section id="for-customers">
            <h2>6. For Customers</h2>
            <p>
              You can always browse as a guest — no account required. Placing
              a restaurant food order works as a guest too, as long as the
              vendor doesn't require advance payment. Booking an appointment
              or reserving a room — Restaurants, Travel, HealthCare, Salon
              &amp; Personal Care, or Wedding — requires signing in first, a
              quick step that confirms it's really you and helps prevent fake
              or prank bookings.
              Creating a customer account also lets you track your bookings
              and orders in one place, review your notification history, and
              reach support through live chat without repeating your details
              every time.
            </p>
          </section>

          <section id="roles">
            <h2>7. Roles in the Platform</h2>
            <div className="doc-grid">
              <div className="doc-grid-card card">
                <h3>Customer</h3>
                <p>Browses, books, and orders. An account is optional for most flows.</p>
              </div>
              <div className="doc-grid-card card">
                <h3>Business Admin</h3>
                <p>Owns and runs a business's listing, services, bookings, and orders through their own dashboard.</p>
              </div>
              <div className="doc-grid-card card">
                <h3>Support (CSR)</h3>
                <p>Agents who look up bookings and orders, run live chat, and handle support tickets.</p>
              </div>
              <div className="doc-grid-card card">
                <h3>Operations</h3>
                <p>Internal team that monitors businesses and their bookings/orders, with limited edit access based on seniority.</p>
              </div>
              <div className="doc-grid-card card">
                <h3>SuperAdmin</h3>
                <p>Qunjee's directors, with full oversight of the platform, billing, and communications.</p>
              </div>
            </div>
          </section>

          <section id="trust-reliability">
            <h2>8. Trust &amp; Reliability</h2>
            <p>
              <strong>No double-booking.</strong> Claiming a slot or a room
              happens as part of the same transaction that confirms your
              booking, checked both on your device and again on the server —
              so two customers can never both be confirmed into the same slot
              or room.
            </p>
            <p>
              <strong>Price-mismatch detection.</strong> If a booking or order
              ever reaches Qunjee with a price that doesn't match what the
              business actually charges, it gets automatically flagged for
              review, so pricing can't be silently tampered with.
            </p>
            <p>
              <strong>Data security.</strong> Access to your data, and to a
              business's data, is controlled on the server — not just hidden
              behind a screen — so the same protections apply no matter which
              device or app someone uses to reach Qunjee.
            </p>
          </section>

          <section id="notifications-support">
            <h2>9. Notifications &amp; Support</h2>
            <p>
              Qunjee sends push notifications for booking and order status
              changes — confirmed, cancelled, out for delivery, and similar —
              along with a welcome message when you first enable
              notifications. Every notification you've received is kept in
              <strong> My Notifications</strong>, so nothing is lost once a
              pop-up disappears; you can mark items read or delete them
              whenever you like.
            </p>
            <p>
              For anything else, live chat support is available throughout the
              app, alongside a self-serve FAQ you can check before starting a
              conversation.
            </p>
          </section>

          <section id="platform-availability">
            <h2>10. Platform &amp; Availability</h2>
            <p>
              Qunjee runs as an installable Progressive Web App — no app-store
              download required. Open it in a browser and add it to your home
              screen on Android, iOS, or desktop, and it behaves like a native
              app from there, including working while offline. A dedicated
              Android app is also in preparation for the Google Play Store.
            </p>
          </section>

          <section id="brand-identity">
            <h2>11. Brand Identity</h2>
            <p>
              <strong>Qunjee</strong> is the single brand shown everywhere in
              the app — the same logo in the top navigation bar and the
              footer, and the same brand across every category (Restaurants,
              Travel, HealthCare, Salon &amp; Personal Care, Wedding,
              Education).
            </p>
          </section>

          <section id="contact">
            <h2>12. Contact / Get in Touch</h2>
            <p>
              <Mail size={14} /> <a href="mailto:hello@qunjee.com">hello@qunjee.com</a>
              <br />
              Or use the live chat widget available throughout the app for the
              fastest response.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}

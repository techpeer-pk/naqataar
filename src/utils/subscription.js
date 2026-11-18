/**
 * Manual subscription status — see docs/Billing-Subscription.md.
 *
 * A business is active if either window hasn't lapsed yet:
 *   trialEndsAt  — set once at creation (free trial, see useBusinesses.create)
 *   activeUntil  — set by SuperAdmin after an off-app (WhatsApp) payment is confirmed
 *
 * A business with NEITHER field (anything registered before this feature
 * shipped) is always active — this is a deliberate grandfather clause so
 * existing businesses are never retroactively suspended.
 *
 * Mirrored in firestore.rules' isSubscriptionActive() — rules can't call
 * JS, so that copy has to stay logically identical to this one by hand.
 */
function toDate(ts) {
  if (!ts) return null;
  return typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
}

export function subscriptionStatus(business, now = new Date()) {
  const trialEndsAt = toDate(business?.trialEndsAt);
  const activeUntil = toDate(business?.activeUntil);

  if (!trialEndsAt && !activeUntil) {
    return { active: true, kind: 'legacy', until: null };
  }

  const inTrial  = trialEndsAt && now <= trialEndsAt;
  const inActive = activeUntil && now <= activeUntil;

  if (inTrial || inActive) {
    // If both windows are open, show whichever ends later — that's the
    // one actually keeping the business active.
    const until = [trialEndsAt, activeUntil].filter(Boolean).sort((a, b) => b - a)[0];
    return { active: true, kind: inActive ? 'subscribed' : 'trial', until };
  }

  const until = [trialEndsAt, activeUntil].filter(Boolean).sort((a, b) => b - a)[0] || null;
  return { active: false, kind: 'expired', until };
}

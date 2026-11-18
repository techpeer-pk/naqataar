// Guard against misspelled email domains at the points where a wrong email
// permanently corrupts data (account creation, guest checkout). Born from a
// real incident (18 Jul 2026): a customer registered as ...@gamil.com, later
// signed in with Google as @gmail.com, and ended up split across two
// accounts. Warn-and-offer-fix only — never auto-correct, so an unusual but
// real domain is never blocked.
const TYPO_DOMAINS = {
  // gmail
  'gamil.com': 'gmail.com', 'gmial.com': 'gmail.com', 'gmal.com': 'gmail.com',
  'gmali.com': 'gmail.com', 'gnail.com': 'gmail.com', 'gamail.com': 'gmail.com',
  'gmaill.com': 'gmail.com', 'gmil.com': 'gmail.com', 'gemail.com': 'gmail.com',
  'gmail.co': 'gmail.com', 'gmail.cm': 'gmail.com', 'gmail.con': 'gmail.com',
  'gmail.om': 'gmail.com', 'gmail.comm': 'gmail.com',
  // hotmail
  'hotmial.com': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'hotmali.com': 'hotmail.com',
  'hotmaill.com': 'hotmail.com', 'hotmail.co': 'hotmail.com', 'hotmail.con': 'hotmail.com',
  'hotmail.cm': 'hotmail.com',
  // yahoo
  'yaho.com': 'yahoo.com', 'yahooo.com': 'yahoo.com', 'yhoo.com': 'yahoo.com',
  'yahoo.co': 'yahoo.com', 'yahoo.con': 'yahoo.com', 'yahoo.cm': 'yahoo.com',
  // outlook
  'outlok.com': 'outlook.com', 'outloook.com': 'outlook.com', 'outllok.com': 'outlook.com',
  'outlook.co': 'outlook.com', 'outlook.con': 'outlook.com', 'outlook.cm': 'outlook.com',
  // icloud
  'iclould.com': 'icloud.com', 'iclod.com': 'icloud.com',
  'icloud.co': 'icloud.com', 'icloud.con': 'icloud.com',
};

// Returns the corrected email if the domain looks like a known typo, else null.
export function suggestEmailFix(email) {
  const at = (email || '').lastIndexOf('@');
  if (at < 1) return null;
  const domain = email.slice(at + 1).toLowerCase().trim();
  const fixed = TYPO_DOMAINS[domain];
  return fixed ? email.slice(0, at + 1) + fixed : null;
}

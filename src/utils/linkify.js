const URL_PATTERN = /(https?:\/\/[^\s]+)/g;
// Common sentence/parenthesis punctuation that ends up glued to a URL with
// no space before it (e.g. "...from (https://qunjee.com/) clickable" — the
// closing paren isn't whitespace, so a naive match would swallow it into
// the href). Stripped off the link and re-appended as plain text after.
const TRAILING_PUNCT = /[).,!?;:'"\]]+$/;

// Splits chat message text into `{ type: 'text' | 'link', value, href? }`
// parts. Kept as data (not JSX) so this stays a plain .js utility, matching
// every other file in src/utils/ — callers (LiveChatPage.jsx,
// SupportChatWidget.jsx) render the actual <a> themselves.
export function linkifyParts(text) {
  if (!text) return [{ type: 'text', value: text }];
  return text
    .split(URL_PATTERN)
    .filter(Boolean)
    .flatMap((part) => {
      if (!/^https?:\/\//.test(part)) return [{ type: 'text', value: part }];
      const trailingMatch = part.match(TRAILING_PUNCT);
      const trailing = trailingMatch ? trailingMatch[0] : '';
      const url = trailing ? part.slice(0, -trailing.length) : part;
      const parts = [{ type: 'link', value: url, href: url }];
      if (trailing) parts.push({ type: 'text', value: trailing });
      return parts;
    });
}

// Generic CDN <script>/<link> injector — dedupes purely via the in-memory
// Sets below (populated only on a confirmed `onload`), never by querying the
// DOM for an existing tag. A DOM-presence check sounds like a reasonable
// extra dedup, but it actively lies during dev: Vite HMR re-runs a module's
// top-level code on every edit without ever removing tags a PREVIOUS (maybe
// failed, maybe mid-flight) attempt already appended, so "a tag with this
// src exists" does not mean "it finished loading successfully". Only trust
// our own onload-confirmed record.
const loadedScripts = new Set();
const loadedStyles  = new Set();

export function loadScript(src) {
  if (loadedScripts.has(src)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => { loadedScripts.add(src); resolve(); };
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

export function loadStyle(href) {
  if (loadedStyles.has(href)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = () => { loadedStyles.add(href); resolve(); };
    link.onerror = () => reject(new Error(`Failed to load stylesheet: ${href}`));
    document.head.appendChild(link);
  });
}

// Day (light, spreadsheet-style) or night (dark) mode. Day is the default; the
// choice is kept per browser. index.html applies it before the page draws.
import { useState, useEffect } from 'react';

const KEY = 'polestar_theme';

function current() {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function useTheme() {
  const [theme, setTheme] = useState(current);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem(KEY, theme); } catch {}
  }, [theme]);
  return [theme, () => setTheme(t => (t === 'light' ? 'dark' : 'light'))];
}

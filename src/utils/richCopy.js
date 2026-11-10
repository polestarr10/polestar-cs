// Copying a quotation so it pastes neatly into Gmail / Outlook.
// The draft lines values up with spaces, which only works in a fixed-width font;
// email uses proportional fonts, so the columns drift. Instead we copy:
//   - HTML: "Label: value" lines become a two-column table, headings go bold;
//   - plain text: the same lines as "Label: value" without the padding.

const ROW = /^([A-Za-z][^:\n]{0,40}):[ \t]+(\S.*)$/;   // "Ocean freight:      $35 / W/M"
const CONT = /^[ \t]{12,}(\S.*)$/;                     // a value continued on the next line
// A heading starts with a capitalised word: "SHIPMENT DETAILS", "QUOTATION (Ref: …) – LCL",
// "DESTINATION CHARGES (at POD)".
const HEADING = /^[A-Z]{4,}(?:\s|$)/;
const balanced = (s) => (s.match(/\(/g) || []).length === (s.match(/\)/g) || []).length;

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function quoteToHtml(text) {
  const out = [];
  let rows = [];
  const flush = () => {
    if (!rows.length) return;
    out.push(`<table style="border-collapse:collapse;margin:2px 0 8px 0">${rows.map(([l, v]) =>
      `<tr><td style="padding:2px 18px 2px 0;vertical-align:top;white-space:nowrap;font-weight:600">${l ? `${esc(l)}:` : ''}</td><td style="padding:2px 0;vertical-align:top">${esc(v)}</td></tr>`).join('')}</table>`);
    rows = [];
  };
  for (const raw of text.replace(/\r/g, '').split('\n')) {
    const line = raw.replace(/\s+$/, '');
    const heading = HEADING.test(line.trim());
    const row = !heading && line.match(ROW);
    const cont = rows.length && line.match(CONT);
    // "Dear Meera," / "Best regards," are ordinary lines, not table rows.
    if (row && balanced(row[1]) && !/^(dear|hi|hello)\b/i.test(row[1])) { rows.push([row[1].trim(), row[2].trim()]); continue; }
    if (cont) { rows.push(['', cont[1].trim()]); continue; }
    flush();
    if (!line.trim()) out.push('<br>');
    else if (heading) out.push(`<div><b>${esc(line.trim())}</b></div>`);
    else out.push(`<div>${esc(line.trim())}</div>`);
  }
  flush();
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.45">${out.join('')}</div>`;
}

export function quoteToPlain(text) {
  return text.replace(/\r/g, '').split('\n').map(l => {
    const row = l.match(ROW);
    if (row) return `${row[1].trim()}: ${row[2].trim()}`;
    const cont = l.match(CONT);
    return cont ? `  ${cont[1].trim()}` : l.trimEnd();
  }).join('\n');
}

// Puts both versions on the clipboard; the app you paste into picks the best one.
export async function copyQuote(text) {
  try {
    if (window.ClipboardItem && navigator.clipboard?.write) {
      await navigator.clipboard.write([new ClipboardItem({
        'text/html': new Blob([quoteToHtml(text)], { type: 'text/html' }),
        'text/plain': new Blob([quoteToPlain(text)], { type: 'text/plain' }),
      })]);
      return true;
    }
  } catch {}
  await navigator.clipboard.writeText(quoteToPlain(text));
  return true;
}

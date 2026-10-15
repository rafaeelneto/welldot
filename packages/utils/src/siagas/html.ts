/**
 * A small, tolerant reader for the SIAGAS detail pages.
 *
 * The pages are 2000s-era table soup: no classes, no `<th>`, rows without
 * `<tr>`, stray `</tr>`/`</table>` and unescaped `&`. A real DOM parser is not
 * needed (and would be a dependency in Workers): the pages are only rows of
 * cells, and the sections are found by their bold headings. This reader turns
 * a fragment into a flat list of rows, each tagged with the table it belongs to.
 */

/** Latin-1 named entities, in code point order from U+00A0. */
const LATIN1_ENTITIES =
  'nbsp iexcl cent pound curren yen brvbar sect uml copy ordf laquo not shy reg macr deg plusmn sup2 sup3 acute micro para middot cedil sup1 ordm raquo frac14 frac12 frac34 iquest Agrave Aacute Acirc Atilde Auml Aring AElig Ccedil Egrave Eacute Ecirc Euml Igrave Iacute Icirc Iuml ETH Ntilde Ograve Oacute Ocirc Otilde Ouml times Oslash Ugrave Uacute Ucirc Uuml Yacute THORN szlig agrave aacute acirc atilde auml aring aelig ccedil egrave eacute ecirc euml igrave iacute icirc iuml eth ntilde ograve oacute ocirc otilde ouml divide oslash ugrave uacute ucirc uuml yacute thorn yuml'.split(
    ' ',
  );

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  Theta: 'Θ',
  theta: 'θ',
  ndash: '–',
  mdash: '—',
  ...Object.fromEntries(
    LATIN1_ENTITIES.map((name, i) => [name, String.fromCharCode(0xa0 + i)]),
  ),
};

/** Decodes HTML entities; unknown ones (and bare `&`) stay as written. */
export function decodeEntities(text: string): string {
  return text.replace(
    /&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi,
    (match, body: string) => {
      if (body[0] === '#') {
        const code =
          body[1] === 'x' || body[1] === 'X'
            ? parseInt(body.slice(2), 16)
            : parseInt(body.slice(1));
        return Number.isFinite(code) ? String.fromCodePoint(code) : match;
      }
      return ENTITIES[body] ?? match;
    },
  );
}

/** Collapses whitespace (including no-break spaces) and trims. */
export function cleanText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** Lowercase, no accents, no trailing colon: the key used to match labels. */
export function labelKey(text: string): string {
  return cleanText(text)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[\s:]+$/, '')
    .trim();
}

/** Removes comments, scripts and styles (the only places with Latin-1 bytes). */
export function stripNoise(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '');
}

export interface Row {
  /** Cell texts, decoded and trimmed. */
  cells: string[];
  /** True when the row holds bold text (a section heading). */
  bold: boolean;
  /** Table the row belongs to; -1 for a heading outside any table. */
  table: number;
}

interface TableFrame {
  id: number;
  row: { cells: string[]; bold: boolean } | null;
  cell: string | null;
}

/**
 * Reads a fragment into rows. Every bold text also becomes a one-cell heading
 * row (`table: -1`) at the point where it ends, so headings come out in
 * document order whether they sit in a table row or loose between tables (an
 * outer row only closes after the tables nested in it). Nested tables get
 * their own id.
 */
export function readRows(fragment: string): Row[] {
  const html = stripNoise(fragment);
  const rows: Row[] = [];
  const stack: TableFrame[] = [];
  let nextId = 0;
  let boldDepth = 0;
  let boldText = '';

  const top = () => stack[stack.length - 1];

  function closeCell(frame: TableFrame) {
    if (frame.cell === null) return;
    if (!frame.row) frame.row = { cells: [], bold: false };
    frame.row.cells.push(cleanText(frame.cell));
    frame.cell = null;
  }

  function closeRow(frame: TableFrame) {
    closeCell(frame);
    if (frame.row && frame.row.cells.length > 0) {
      rows.push({
        cells: frame.row.cells,
        bold: frame.row.bold,
        table: frame.id,
      });
    }
    frame.row = null;
  }

  function text(raw: string) {
    const value = decodeEntities(raw);
    const frame = top();
    if (frame && frame.cell !== null) {
      frame.cell += value;
      if (boldDepth > 0 && cleanText(value)) {
        if (!frame.row) frame.row = { cells: [], bold: false };
        frame.row.bold = true;
      }
    }
    if (boldDepth > 0) boldText += value;
  }

  const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;
  let last = 0;
  for (let m = tagRe.exec(html); m; m = tagRe.exec(html)) {
    if (m.index > last) text(html.slice(last, m.index));
    last = tagRe.lastIndex;
    const closing = m[1] === '/';
    const tag = m[2].toLowerCase();
    const frame = top();

    switch (tag) {
      case 'table':
        if (!closing) {
          stack.push({ id: nextId++, row: null, cell: null });
        } else if (frame) {
          closeRow(frame);
          stack.pop();
        }
        break;
      case 'tr':
        if (frame) closeRow(frame);
        break;
      case 'td':
      case 'th':
        if (!frame) break;
        closeCell(frame);
        if (!closing) frame.cell = '';
        break;
      case 'b':
      case 'strong':
        if (!closing) {
          boldDepth++;
        } else if (boldDepth > 0) {
          boldDepth--;
          if (boldDepth === 0) {
            if (cleanText(boldText)) {
              rows.push({
                cells: [cleanText(boldText)],
                bold: true,
                table: -1,
              });
            }
            boldText = '';
          }
        }
        break;
      case 'br':
        text(' ');
        break;
      default:
        break;
    }
  }
  if (last < html.length) text(html.slice(last));
  while (stack.length) {
    closeRow(top()!);
    stack.pop();
  }
  return rows;
}

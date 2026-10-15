import { cleanText, decodeEntities, stripNoise } from './html';

/** RIMAS page of a well: level series and the "Relatórios e Multimídias" tab. */
export const RIMAS_PAGE_URL =
  'https://rimasweb.sgb.gov.br/layout/detalhe_poco.php?ponto=';

/** One reading of the RIMAS water level series. */
export interface RimasReading {
  /** Calendar date of the reading (`YYYY-MM-DD`, from the series' UTC day). */
  date: string;
  /** Depth to water below ground (m). */
  level: number;
}

/** A photo or document listed on the RIMAS page. */
export interface RimasMedia {
  kind: 'photo' | 'document';
  /** Absolute URL of the file on the SGB server. */
  url: string;
  filename: string;
  /** The caption (photos) or link text (documents). */
  title?: string;
}

export interface RimasPage {
  readings: RimasReading[];
  media: RimasMedia[];
}

/**
 * Reads a RIMAS well page (`rimasweb.sgb.gov.br/layout/detalhe_poco.php`).
 * The daily level series is inline JavaScript (`d1 = [["<epoch ms>", "<m>"], …]`,
 * or `d1 = 0` for a well outside the network). Photos are lightbox links with
 * a `data-title` caption; other documents are plain links to `../documentos/`.
 *
 * @param html The page, decoded as UTF-8.
 * @returns The readings sorted by date and the media in page order; both
 *   empty for a well without RIMAS data.
 */
export function parseRimasPage(html: string): RimasPage {
  const readings: RimasReading[] = [];
  const series = html.match(/\bd1\s*=\s*\[(.*?)\];/s);
  if (series) {
    for (const m of series[1].matchAll(/\[\s*"(\d+)"\s*,\s*"([^"]*)"\s*\]/g)) {
      const level = Number(m[2].replace(',', '.'));
      const time = Number(m[1]);
      if (!m[2].trim() || !Number.isFinite(level) || !Number.isFinite(time)) {
        continue;
      }
      readings.push({ date: new Date(time).toISOString().slice(0, 10), level });
    }
    readings.sort((a, b) => a.date.localeCompare(b.date));
  }

  const media: RimasMedia[] = [];
  const at = html.indexOf('<div id="tabs-7">');
  if (at >= 0) {
    const tab = stripNoise(html.slice(at));
    const seen = new Set<string>();
    for (const m of tab.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
      const attrs = m[1];
      const href = attrs.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
      if (!href || !/documentos\//i.test(href)) continue;
      const url = new URL(decodeEntities(href), RIMAS_PAGE_URL).href;
      if (seen.has(url)) continue;
      seen.add(url);
      const caption = attrs.match(/\bdata-title\s*=\s*"([^"]*)"/i)?.[1];
      const isPhoto = /data-lightbox/i.test(attrs);
      const title = cleanText(
        decodeEntities(caption ?? m[2].replace(/<[^>]*>/g, ' ')),
      );
      media.push({
        kind: isPhoto ? 'photo' : 'document',
        url,
        filename: decodeURIComponent(url.slice(url.lastIndexOf('/') + 1)),
        ...(title && { title }),
      });
    }
  }
  return { readings, media };
}

/** Keeps the last reading of each calendar month. */
export function monthlyRimasReadings(readings: RimasReading[]): RimasReading[] {
  const byMonth = new Map<string, RimasReading>();
  for (const r of readings) {
    const month = r.date.slice(0, 7);
    const current = byMonth.get(month);
    if (!current || r.date >= current.date) byMonth.set(month, r);
  }
  return [...byMonth.values()].sort((a, b) => a.date.localeCompare(b.date));
}

// Minimal local type shim for `pdfmake` (npm `^0.3.7`).
// The package ships no `.d.ts` files (verified against the installed 0.3.7
// tarball — no `types` field in package.json, no `.d.ts` anywhere under
// `build/`, `js/`, or `src/`) and `@types/pdfmake` on npm tops out at 0.3.3
// with a stale (pre-0.3.x API) shape. This shim covers only the subset of
// the docDefinition/content model and the `pdfMake` instance API this
// feature actually uses.

export type Alignment = 'left' | 'center' | 'right' | 'justify';
export type Margins =
  | number
  | [number, number]
  | [number, number, number, number];
export type ColumnWidth = number | string | 'auto' | '*';

export interface StyleDictionary {
  [styleName: string]: Style;
}

export interface Style {
  font?: string;
  fontSize?: number;
  bold?: boolean;
  italics?: boolean;
  color?: string;
  alignment?: Alignment;
  decoration?: string;
}

type StyleRef = string | string[];

export interface ContentText {
  text: string | ContentText[];
  style?: StyleRef;
  font?: string;
  fontSize?: number;
  bold?: boolean;
  italics?: boolean;
  color?: string;
  alignment?: Alignment;
  decoration?: string;
  width?: ColumnWidth;
  margin?: Margins;
  colSpan?: number;
}

export interface ContentColumns {
  columns: Content[];
  columnGap?: number;
  width?: ColumnWidth;
  margin?: Margins;
}

export interface ContentStack {
  stack: Content[];
  margin?: Margins;
  width?: ColumnWidth;
  /** If true, the whole element (and its children) is kept together on one page. */
  unbreakable?: boolean;
}

export type TableCell = Content | Record<string, never>;

export interface TableLayout {
  hLineWidth?: (
    _rowIndex: number,
    _node: { table: { body: unknown[][] } },
  ) => number;
  vLineWidth?: (
    _columnIndex: number,
    _node: { table: { body: unknown[][] } },
  ) => number;
  hLineColor?: (
    _rowIndex: number,
    _node: { table: { body: unknown[][] } },
  ) => string;
}

export interface ContentTable {
  table: {
    headerRows?: number;
    widths?: ColumnWidth[];
    heights?: number | number[];
    dontBreakRows?: boolean;
    /** Number of rows after the header to bind to it — pdfmake requires a positive integer; `true` is silently ignored. */
    keepWithHeaderRows?: number;
    body: TableCell[][];
  };
  layout?: string | TableLayout;
  margin?: Margins;
}

export interface AbsolutePosition {
  x: number;
  y: number;
}

export interface ContentSvg {
  svg: string;
  width?: number;
  height?: number;
  margin?: Margins;
  pageBreak?: 'before' | 'after';
  absolutePosition?: AbsolutePosition;
}

export interface ContentImage {
  /** Data URL (`data:image/png;base64,…`) or a name registered in `images`. */
  image: string;
  width?: number;
  height?: number;
  /** Fit inside a `[width, height]` box, keeping the aspect ratio. */
  fit?: [number, number];
  opacity?: number;
  margin?: Margins;
  absolutePosition?: AbsolutePosition;
}

export interface CanvasLine {
  type: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  lineWidth?: number;
  lineColor?: string;
}

export interface ContentCanvas {
  canvas: CanvasLine[];
  margin?: Margins;
}

export type Content =
  | ContentText
  | ContentColumns
  | ContentStack
  | ContentTable
  | ContentSvg
  | ContentImage
  | ContentCanvas
  | string;

/** pdfmake's native text watermark, drawn on every page. */
export interface Watermark {
  text: string;
  color?: string;
  opacity?: number;
  bold?: boolean;
  italics?: boolean;
  fontSize?: number;
  font?: string;
  /** Rotation in degrees; pdfmake defaults to the page diagonal. */
  angle?: number;
}

export interface TDocumentDefinition {
  content: Content[];
  defaultStyle?: Style;
  pageSize?: { width: number; height: number | 'auto' };
  pageOrientation?: 'portrait' | 'landscape';
  pageMargins?: Margins;
  watermark?: Watermark;
  background?: (
    _currentPage: number,
    _pageSize: { width: number; height: number },
  ) => Content | Content[] | undefined;
  info?: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string;
    creator?: string;
    producer?: string;
  };
  header?: (
    _currentPage: number,
    _pageCount: number,
    _pageSize: { width: number; height: number },
  ) => Content | Content[] | undefined;
  footer?: (
    _currentPage: number,
    _pageCount: number,
  ) => Content | Content[] | undefined;
  styles?: StyleDictionary;
}

export interface TFontFamily {
  normal: string;
  bold: string;
  italics: string;
  bolditalics: string;
}

export interface TFontDictionary {
  [fontName: string]: TFontFamily;
}

export interface TCreatedPdf {
  getDataUrl(): Promise<string>;
  getBlob(): Promise<Blob>;
  download(_filename?: string): Promise<void>;
  print(_win?: Window | null): Promise<void>;
  open(_win?: Window | null): Promise<void>;
}

export interface PdfMakeStatic {
  createPdf(_docDefinition: TDocumentDefinition): TCreatedPdf;
  addVirtualFileSystem(_vfs: Record<string, string>): void;
  addFonts(_fonts: TFontDictionary): void;
}

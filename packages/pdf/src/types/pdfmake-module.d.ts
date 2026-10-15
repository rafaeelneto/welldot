// `pdfmake` ships no `.d.ts` files (checked the installed 0.3.7 tarball) and
// `@types/pdfmake` on npm is stale (tops out at 0.3.3, pre-dating this API).
// Declare the browser build's module shape using the local shim types in
// `./pdfmake.types.ts` instead of importing untyped.

declare module 'pdfmake/build/pdfmake' {
  import type { PdfMakeStatic } from './pdfmake.types';

  const pdfMake: PdfMakeStatic;
  export default pdfMake;
}

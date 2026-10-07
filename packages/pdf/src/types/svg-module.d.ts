// `.svg` files are imported as their raw markup: tsup uses the `text`
// loader (see tsup.config.ts) and Vitest a matching plugin (vitest.config.ts).
declare module '*.svg' {
  const markup: string;
  export default markup;
}

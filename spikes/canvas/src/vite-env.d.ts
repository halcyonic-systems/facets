/// <reference types="vite/client" />

// The kernel wasm binary is imported as a URL asset (Vite's ?url suffix);
// vite/client only declares this for local *.wasm?init, not the pkg's own
// path pattern, so mirror it here.
declare module "*.wasm?url" {
  const url: string;
  export default url;
}

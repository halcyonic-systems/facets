import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { initTheme } from "./theme";
import "./index.css";
import App from "./App";
import { initReasoner } from "./reasoner";

// The stored theme choice goes on <html> before anything else runs — before the
// stylesheet's first paint where the loader allows it, and in any case before
// React mounts, so an explicit choice that disagrees with the OS never shows the
// OS's answer first. Synchronous on purpose: the reasoner's init below is
// awaited, and the theme must not wait behind it.
initTheme();

// Read the stored reasoner setting before first paint, so the co-author's gate
// renders its real state (off, or on and pointed somewhere) rather than
// flashing "off" and correcting itself.
void initReasoner().finally(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});

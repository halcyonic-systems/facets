import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { initReasoner } from "./reasoner";

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

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { ready } from "./kernel";

const root = createRoot(document.getElementById("root")!);

// The kernel must be instantiated before anything touches it — App renders a
// loading state until this resolves.
ready()
  .then(() => {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  })
  .catch((err) => {
    root.render(
      <div style={{ padding: 24, fontFamily: "monospace", color: "#d1435b" }}>
        kernel failed to load: {String(err)}
      </div>,
    );
  });

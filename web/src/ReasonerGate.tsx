// The one enable point (#199, decision 2026-07-25). Turning the co-author on
// IS choosing where it runs — the choice is presented here, inline, in the
// moment the author reaches for the drafter, not in a settings pane. Once on,
// this same strip says which reasoner is in use and turns it back off.
import { useState } from "react";
import { isDesktop } from "./desktop";
import {
  DEFAULT_ENDPOINT,
  HOSTED_ENDPOINT,
  blockedOnDesktop,
  endpointKind,
  type ReasonerConfig,
} from "./reasoner";

export function ReasonerGate({
  config,
  onChange,
}: {
  config: ReasonerConfig;
  onChange: (next: ReasonerConfig) => void;
}) {
  const [choosing, setChoosing] = useState(false);
  if (config.enabled && !choosing) {
    return <ReasonerStatus config={config} onChange={onChange} onChoose={() => setChoosing(true)} />;
  }
  return (
    <ReasonerChoice
      config={config}
      onCancel={choosing ? () => setChoosing(false) : undefined}
      onChange={(next) => {
        setChoosing(false);
        onChange(next);
      }}
    />
  );
}

function ReasonerStatus({
  config,
  onChange,
  onChoose,
}: {
  config: ReasonerConfig;
  onChange: (next: ReasonerConfig) => void;
  onChoose: () => void;
}) {
  const own = endpointKind(config.endpoint) === "own";
  return (
    <div className="mb-2 flex items-center justify-between gap-2 rounded p-2" style={panel}>
      <p className="min-w-0 text-[11px]" style={{ color: "var(--text-secondary)" }}>
        Co-author is on, using{" "}
        <strong>{own ? "your own reasoner" : "Halcyonic's hosted reasoner"}</strong> at{" "}
        <span className="font-mono break-all">{config.endpoint}</span>
      </p>
      <div className="flex shrink-0 items-center gap-1">
        <button onClick={onChoose} className="rounded-full px-2 py-0.5 text-[10px]" style={quietButton}>
          Change
        </button>
        <button
          onClick={() => onChange({ ...config, enabled: false })}
          className="rounded-full px-2 py-0.5 text-[10px]"
          style={quietButton}
        >
          Turn off
        </button>
      </div>
    </div>
  );
}

function ReasonerChoice({
  config,
  onChange,
  onCancel,
}: {
  config: ReasonerConfig;
  onChange: (next: ReasonerConfig) => void;
  onCancel?: () => void;
}) {
  const startsHosted = config.enabled && endpointKind(config.endpoint) === "hosted";
  const [hosted, setHosted] = useState(startsHosted);
  const [url, setUrl] = useState(startsHosted ? DEFAULT_ENDPOINT : config.endpoint || DEFAULT_ENDPOINT);
  const endpoint = hosted ? HOSTED_ENDPOINT : url.trim();
  const cspWarning = isDesktop() && blockedOnDesktop(endpoint);

  return (
    <div className="mb-2 rounded p-3" style={panel}>
      <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
        Turn on the co-author
      </p>
      <p className="mt-1 text-[11px]" style={{ color: "var(--text-secondary)" }}>
        The co-author sends your description, and the model it is working on, to a
        reasoner. It stays off until you say where that reasoner runs.
      </p>

      <label className="mt-3 flex cursor-pointer items-start gap-2">
        <input type="radio" checked={!hosted} onChange={() => setHosted(false)} className="mt-0.5" />
        <span className="min-w-0">
          <span className="text-[11px] font-semibold" style={{ color: "var(--text-primary)" }}>
            Your own reasoner
          </span>
          <span className="block text-[11px]" style={{ color: "var(--text-muted)" }}>
            Your text goes only to the machine at this address. Nothing reaches Halcyonic.
          </span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onFocus={() => setHosted(false)}
            spellCheck={false}
            className="mt-1 w-full rounded p-1 font-mono text-[11px] outline-none"
            style={{ background: "var(--bg-primary)", color: "var(--text-secondary)", border: "1px solid var(--hairline)" }}
            placeholder={DEFAULT_ENDPOINT}
          />
        </span>
      </label>

      <label className="mt-3 flex cursor-pointer items-start gap-2">
        <input type="radio" checked={hosted} onChange={() => setHosted(true)} className="mt-0.5" />
        <span className="min-w-0">
          <span className="text-[11px] font-semibold" style={{ color: "var(--text-primary)" }}>
            Halcyonic's hosted reasoner
          </span>
          <span className="block text-[11px]" style={{ color: "var(--text-muted)" }}>
            Your description and model text travel to a server Halcyonic runs, which
            passes them to the model it is configured with. Nothing else on your
            machine is read or sent.
          </span>
        </span>
      </label>

      {cspWarning && (
        <p className="mt-2 text-[11px]" style={{ color: "var(--verdict-warning)" }}>
          The desktop app is not permitted to call {endpoint}. Its allowed addresses are
          fixed when the app is built — use one of those, or open this endpoint in the
          browser build.
        </p>
      )}

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={() => onChange({ enabled: true, endpoint: endpoint || DEFAULT_ENDPOINT })}
          disabled={!endpoint}
          className="rounded-full px-3 py-1 text-xs font-semibold"
          style={{
            background: "var(--accent)",
            color: "var(--text-on-accent)",
            opacity: endpoint ? 1 : 0.5,
            cursor: endpoint ? "pointer" : "not-allowed",
          }}
        >
          Turn on
        </button>
        {onCancel && (
          <button onClick={onCancel} className="rounded-full px-2 py-0.5 text-[10px]" style={quietButton}>
            Cancel
          </button>
        )}
        <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          Turn it off, or change the address, whenever you like.
        </span>
      </div>
    </div>
  );
}

const panel = {
  background: "var(--bg-primary)",
  border: "1px solid var(--hairline)",
} as const;

const quietButton = {
  border: "1px solid var(--hairline)",
  color: "var(--text-secondary)",
} as const;

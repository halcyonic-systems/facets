// The one enable point (#199, decision 2026-07-25). Turning the co-author on
// IS saying where it runs — the address is asked for here, inline, in the
// moment the author reaches for the drafter, not in a settings pane. Once on,
// it shrinks to one quiet line under the model picker that says which reasoner
// is in use, where the text goes, and turns it back off.
//
// #229: there is no longer a second, hosted option. v0.1 ships no remote
// address, so the reasoner is one the user runs, and this is a field rather
// than a pick.
import { useState } from "react";
import { isDesktop } from "./desktop";
import { DEFAULT_ENDPOINT, blockedOnDesktop, isHosted, type ReasonerConfig } from "./reasoner";

export function ReasonerGate({
  config,
  detail,
  turnOnLabel,
  onChange,
}: {
  config: ReasonerConfig;
  /** Where the chosen model runs, said beside the reasoner once it is on. */
  detail?: string;
  /** What turning on will do, when it does more than turn on: a description
   *  already waiting is drafted, and the button says so before it is pressed. */
  turnOnLabel?: string;
  onChange: (next: ReasonerConfig) => void;
}) {
  const [choosing, setChoosing] = useState(false);
  if (config.enabled && !choosing) {
    return <ReasonerStatus config={config} detail={detail} onChange={onChange} onChoose={() => setChoosing(true)} />;
  }
  return (
    <ReasonerChoice
      config={config}
      turnOnLabel={turnOnLabel}
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
  detail,
  onChange,
  onChoose,
}: {
  config: ReasonerConfig;
  detail?: string;
  onChange: (next: ReasonerConfig) => void;
  onChoose: () => void;
}) {
  const hosted = isHosted(config.endpoint);
  return (
    <p
      className="mt-1 flex flex-wrap items-baseline gap-x-2 text-[10px]"
      style={{ color: "var(--text-muted)" }}
      title={`Your description is sent to ${config.endpoint}`}
      data-testid="reasoner-status"
    >
      <span className="min-w-0 break-all">
        {hosted ? "the facets reasoner" : `your reasoner at ${config.endpoint}`}
        {detail ? ` · ${detail}` : ""}
      </span>
      <button onClick={onChoose} className="underline" style={{ color: "var(--text-secondary)" }}>
        Change
      </button>
      <button
        onClick={() => onChange({ ...config, enabled: false })}
        className="underline"
        style={{ color: "var(--text-secondary)" }}
      >
        Turn off
      </button>
    </p>
  );
}

function ReasonerChoice({
  config,
  turnOnLabel,
  onChange,
  onCancel,
}: {
  config: ReasonerConfig;
  turnOnLabel?: string;
  onChange: (next: ReasonerConfig) => void;
  onCancel?: () => void;
}) {
  const [url, setUrl] = useState(config.endpoint || DEFAULT_ENDPOINT);
  const endpoint = url.trim();
  const cspWarning = isDesktop() && blockedOnDesktop(endpoint);
  const hosted = isHosted(endpoint);

  return (
    <div className="mt-2 rounded p-3" style={panel}>
      <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
        Turn on the co-author
      </p>
      <p className="mt-1 text-[11px]" style={{ color: "var(--text-secondary)" }}>
        {hosted
          ? "The co-author sends your description, and the model it is working on, to the facets reasoner, which asks a frontier model on your behalf. It stays off until you turn it on."
          : "The co-author sends your description, and the model it is working on, to a reasoner you run. It stays off until you say where that reasoner is."}
      </p>

      <label className="mt-3 block">
        <span className="text-[11px] font-semibold" style={{ color: "var(--text-primary)" }}>
          The reasoner's address
        </span>
        <span className="block text-[11px]" style={{ color: "var(--text-muted)" }}>
          {hosted
            ? "Your text goes to Halcyonic's server at this address, under an anonymous session — nothing you draw on the canvas leaves the page. Point it at a reasoner you run and nothing reaches Halcyonic."
            : "Your text goes only to the machine at this address. This app ships no other one — nothing reaches Halcyonic."}
        </span>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          spellCheck={false}
          className="mt-1 w-full rounded p-1 font-mono text-[11px] outline-none"
          style={{ background: "var(--bg-primary)", color: "var(--text-secondary)", border: "1px solid var(--hairline)" }}
          placeholder={DEFAULT_ENDPOINT}
        />
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
          {turnOnLabel ?? "Turn on"}
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

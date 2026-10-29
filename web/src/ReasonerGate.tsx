// The one enable point (#199, decision 2026-07-25). Turning the co-author on
// IS saying where it runs — the address is asked for here, inline, in the
// moment the author reaches for the drafter, not in a settings pane. Once on,
// it shrinks to one quiet line under the model picker that says which reasoner
// is in use, where the text goes, and turns it back off.
//
// #229: there is no longer a second, hosted option. v0.1 ships no remote
// address, so the reasoner is one the user runs, and this is a field rather
// than a pick.
import { useId, useState } from "react";
import { Button, Input } from "./ui";
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
    // One line: who answers and where, then the two quiet actions (rule 11:
    // 28px targets; the words were 10px underlines).
    <p
      className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs"
      style={{ color: "var(--text-muted)" }}
      title={`Your description is sent to ${config.endpoint}`}
      data-testid="reasoner-status"
    >
      <span className="min-w-0 break-all">
        {hosted ? "the facets reasoner" : `your reasoner at ${config.endpoint}`}
        {detail ? ` · ${detail}` : ""}
      </span>
      <Button size={28} variant="quiet" onClick={onChoose}>
        Change
      </Button>
      <Button size={28} variant="quiet" onClick={() => onChange({ ...config, enabled: false })}>
        Turn off
      </Button>
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
  const addressId = useId();
  const endpoint = url.trim();
  const cspWarning = isDesktop() && blockedOnDesktop(endpoint);
  const hosted = isHosted(endpoint);

  return (
    <div className="mt-2 rounded-sm p-3" style={panel}>
      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
        Turn on the co-author
      </p>
      <p className="mt-1 max-w-[72ch] text-xs" style={{ color: "var(--text-secondary)" }}>
        {hosted
          ? "The co-author sends your description, and the model it is working on, to the facets reasoner, which asks a frontier model on your behalf. It stays off until you turn it on."
          : "The co-author sends your description, and the model it is working on, to a reasoner you run. It stays off until you say where that reasoner is."}
      </p>

      {/* The field under a visible label (rule 15); where the text goes is a
          --t-meta disclosure under it rather than a third paragraph (#399). */}
      <div className="mt-3">
        <label htmlFor={addressId} className="block text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
          The reasoner's address
        </label>
        <Input
          id={addressId}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          spellCheck={false}
          className="mt-1 w-full font-mono"
          placeholder={DEFAULT_ENDPOINT}
        />
        <details className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
          <summary className="cursor-pointer select-none rounded-sm py-1">Where the text goes</summary>
          <p className="max-w-[72ch] pt-1">
            {hosted
              ? "Your text goes to Halcyonic's server at this address, under an anonymous session — nothing you draw on the canvas leaves the page. Point it at a reasoner you run and nothing reaches Halcyonic."
              : "Your text goes only to the machine at this address. This app ships no other one — nothing reaches Halcyonic."}
          </p>
        </details>
      </div>

      {cspWarning && (
        <p className="mt-2 max-w-[72ch] text-xs" style={{ color: "var(--verdict-warning)" }}>
          The desktop app is not permitted to call {endpoint}. Its allowed addresses are
          fixed when the app is built — use one of those, or open this endpoint in the
          browser build.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size={28} onClick={() => onChange({ enabled: true, endpoint: endpoint || DEFAULT_ENDPOINT })} disabled={!endpoint}>
          {turnOnLabel ?? "Turn on"}
        </Button>
        {onCancel && (
          <Button size={28} variant="quiet" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
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

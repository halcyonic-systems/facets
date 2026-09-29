// The 3D view of the Model face (facets#435, beta). A sibling of <Canvas> with
// the same read-only inputs: the model, the kernel's facts, the scrubbed sim
// frame. It never edits the model. three arrives through a dynamic import
// inside the mount effect, so the main chunk does not carry it.

import { useEffect, useRef, useState } from "react";
import type { CanvasModel, Lens, LensFacts, Thing } from "../kernel/types";
import type { SimFrame } from "../canvas/types";
import { LensRegistry } from "../canvas/lenses/registry";
import { sceneFromCanvasModel } from "./scene";
import type { SceneAdapter } from "./ThreeAdapter";

export interface Canvas3DProps {
  model: CanvasModel;
  lens: Lens;
  facts: LensFacts | null;
  sim: SimFrame | null;
  selectedThingId: number | null;
  onSelectThing?: (id: number | null) => void;
  onEnterThing?: (thing: Thing) => void;
  inert?: boolean;
}

export default function Canvas3D({
  model,
  lens,
  facts,
  sim,
  selectedThingId,
  onSelectThing,
  onEnterThing,
}: Canvas3DProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const adapterRef = useRef<SceneAdapter | null>(null);
  const [ready, setReady] = useState(false);
  const [explode, setExplode] = useState(0);
  const [failed, setFailed] = useState<string | null>(null);
  const callbacks = useRef({ onSelectThing, onEnterThing, model });
  callbacks.current = { onSelectThing, onEnterThing, model };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let alive = true;
    let adapter: SceneAdapter | null = null;
    void (async () => {
      try {
        const [{ SceneAdapter }, { resolveSceneColors }] = await Promise.all([
          import("./ThreeAdapter"),
          import("./colors"),
        ]);
        if (!alive) return;
        adapter = new SceneAdapter(host, resolveSceneColors(host), {
          onSelect: (id) => callbacks.current.onSelectThing?.(id),
          onEnter: (id) => {
            const t = callbacks.current.model.things.find((x) => x.id === id);
            if (t?.child_model) callbacks.current.onEnterThing?.(t);
          },
        });
        adapterRef.current = adapter;
        setReady(true);
      } catch (err) {
        if (alive) setFailed(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      alive = false;
      adapterRef.current = null;
      adapter?.dispose();
      setReady(false);
    };
  }, []);

  useEffect(() => {
    const adapter = adapterRef.current;
    if (!ready || !adapter) return;
    adapter.setScene(sceneFromCanvasModel(model, facts, sim, LensRegistry[lens].shell3d));
    adapter.setExplode(explode);
    adapter.setSelection(selectedThingId);
    // explode and selection are applied by their own effects after a rebuild;
    // listing them here would rebuild the scene on every slider tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, model, facts, sim, lens]);

  useEffect(() => {
    adapterRef.current?.setExplode(explode);
  }, [explode, ready]);

  useEffect(() => {
    adapterRef.current?.setSelection(selectedThingId);
  }, [selectedThingId, ready]);

  useEffect(() => {
    if (!ready) return;
    const host = hostRef.current;
    if (!host) return;
    const mo = new MutationObserver(() => {
      void import("./colors").then(({ resolveSceneColors }) => {
        adapterRef.current?.setColors(resolveSceneColors(host));
      });
    });
    mo.observe(host.ownerDocument.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onScheme = () => mo.takeRecords() && adapterRef.current && import("./colors").then(({ resolveSceneColors }) => adapterRef.current?.setColors(resolveSceneColors(host)));
    mq.addEventListener("change", onScheme);
    return () => {
      mo.disconnect();
      mq.removeEventListener("change", onScheme);
    };
  }, [ready]);

  return (
    <div className="relative h-full w-full" data-testid="canvas-3d" data-export-ignore>
      <div ref={hostRef} className="absolute inset-0" />
      {failed && (
        <div className="absolute inset-0 flex items-center justify-center text-xs" style={{ color: "var(--text-muted)" }}>
          The 3D view could not start: {failed}
        </div>
      )}
      {!ready && !failed && (
        <div className="absolute inset-0 flex items-center justify-center text-xs" style={{ color: "var(--text-muted)" }}>
          Loading the 3D view…
        </div>
      )}
      <div
        className="absolute left-3 bottom-3 flex items-center gap-2 px-2 py-1 text-[11px]"
        style={{
          background: "var(--bg-primary)",
          border: "1px solid var(--hairline)",
          borderRadius: "var(--radius-md)",
          boxShadow: "var(--shadow-card)",
          color: "var(--text-secondary)",
        }}
      >
        <label htmlFor="explode-3d">Explode</label>
        <input
          id="explode-3d"
          type="range"
          min={0}
          max={100}
          value={Math.round(explode * 100)}
          onChange={(e) => setExplode(Number(e.target.value) / 100)}
          aria-label="Explode the system apart"
        />
        <span className="tabular">{Math.round(explode * 100)}%</span>
        <button
          type="button"
          className="px-1.5"
          style={{ color: "var(--text-secondary)" }}
          onClick={() => adapterRef.current?.fit()}
          title="Fit the model (Home)"
        >
          fit
        </button>
      </div>
      <div
        className="absolute right-3 top-3 px-2 py-0.5 text-[10px] uppercase tracking-wide"
        style={{ color: "var(--text-muted)", background: "var(--bg-primary)", borderRadius: "var(--radius-pill)", border: "1px solid var(--hairline)" }}
      >
        3D · beta
      </div>
    </div>
  );
}

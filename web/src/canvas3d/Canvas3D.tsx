// The 3D view of the Model face (facets#435, beta). A sibling of <Canvas> with
// the same read-only inputs: the model, the kernel's facts, the scrubbed sim
// frame. It never edits the model. three arrives through a dynamic import
// inside the mount effect, so the main chunk does not carry it.
//
// Chrome lives on the LEFT of the stage: the run card, the residue notice
// and the kernel chip own the right edge.

import { useEffect, useMemo, useRef, useState } from "react";
import type { CanvasModel, Kind, Lens, LensFacts, Thing } from "../kernel/types";
import type { SimFrame } from "../canvas/types";
import { LensRegistry } from "../canvas/lenses/registry";
import { sceneFromCanvasModel, type Scene3D } from "./scene";
import type { ViewFilter } from "./filter";
import type { SceneAdapter } from "./ThreeAdapter";

export interface Canvas3DProps {
  model: CanvasModel;
  lens: Lens;
  facts: LensFacts | null;
  sim: SimFrame | null;
  selectedThingId: number | null;
  onSelectThing?: (id: number | null) => void;
  onEnterThing?: (thing: Thing) => void;
  /** Files dropped on the stage or chosen with Open — routed to the app's
   *  import path, which reads archives and SL alike. */
  onOpenFiles?: (files: File[]) => void;
  inert?: boolean;
}

const KIND_ORDER: Kind[] = ["Matter", "Energy", "Informational", "Field", "Unspecified"];

const chromeStyle = {
  background: "var(--bg-primary)",
  border: "1px solid var(--hairline)",
  borderRadius: "var(--radius-md)",
  boxShadow: "var(--shadow-card)",
  color: "var(--text-secondary)",
} as const;

export default function Canvas3D({
  model,
  lens,
  facts,
  sim,
  selectedThingId,
  onSelectThing,
  onEnterThing,
  onOpenFiles,
}: Canvas3DProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const adapterRef = useRef<SceneAdapter | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [explode, setExplode] = useState(0);
  const [squareness, setSquareness] = useState(0.6);
  const [crossSquareness, setCrossSquareness] = useState(0);
  const [box, setBox] = useState(false);
  const [kinds, setKinds] = useState<Set<Kind> | null>(null);
  const [envIds, setEnvIds] = useState<Set<number> | null>(null);
  const [portKeys, setPortKeys] = useState<Set<string> | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const callbacks = useRef({ onSelectThing, onEnterThing, onOpenFiles, model });
  callbacks.current = { onSelectThing, onEnterThing, onOpenFiles, model };

  const shell = LensRegistry[lens].shell3d;
  const scene: Scene3D = useMemo(
    () => sceneFromCanvasModel(model, facts, sim, shell, { squareness, crossSquareness, box }),
    [model, facts, sim, shell, squareness, crossSquareness, box],
  );
  const filter: ViewFilter = useMemo(
    () => ({ selected: selectedThingId, kinds, envIds, portKeys }),
    [selectedThingId, kinds, envIds, portKeys],
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let alive = true;
    let adapter: SceneAdapter | null = null;
    void (async () => {
      try {
        const [{ SceneAdapter }, { resolveSceneColors }] = await Promise.all([import("./ThreeAdapter"), import("./colors")]);
        if (!alive) return;
        adapter = new SceneAdapter(host, resolveSceneColors(host), {
          onSelect: (id) => callbacks.current.onSelectThing?.(id),
          onEnter: (id) => {
            const t = callbacks.current.model.things.find((x) => x.id === id);
            if (t?.child_model) callbacks.current.onEnterThing?.(t);
          },
        });
        adapterRef.current = adapter;
        if (import.meta.env.DEV) (window as unknown as { __canvas3d?: SceneAdapter }).__canvas3d = adapter;
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

  const sceneRef = useRef<Scene3D | null>(null);
  useEffect(() => {
    const adapter = adapterRef.current;
    if (!ready || !adapter) return;
    // A shape change keeps the camera; a new model refits.
    const sameModel = sceneRef.current !== null && sceneRef.current.rootName === scene.rootName && sceneRef.current.entities.length === scene.entities.length;
    sceneRef.current = scene;
    adapter.setScene(scene, sameModel);
    adapter.setExplode(explode);
    adapter.setFilter(filter);
    // explode and filter are applied by their own effects after a rebuild.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, scene]);

  useEffect(() => {
    adapterRef.current?.setExplode(explode);
  }, [explode, ready]);

  useEffect(() => {
    adapterRef.current?.setFilter(filter);
  }, [filter, ready]);

  useEffect(() => {
    if (!ready) return;
    const host = hostRef.current;
    if (!host) return;
    const recolor = () => {
      void import("./colors").then(({ resolveSceneColors }) => adapterRef.current?.setColors(resolveSceneColors(host)));
    };
    const mo = new MutationObserver(recolor);
    mo.observe(host.ownerDocument.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-lens"] });
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", recolor);
    return () => {
      mo.disconnect();
      mq.removeEventListener("change", recolor);
    };
  }, [ready]);

  // Filter menu contents come from the scene, so the menu offers only what
  // the model has.
  const kindsPresent = KIND_ORDER.filter((k) => scene.flows.some((f) => f.kind === k));
  const envs = scene.entities.filter((e) => e.kind === "source" || e.kind === "sink" || e.kind === "neutral");
  const anyFilter = kinds !== null || envIds !== null || portKeys !== null;

  const toggleIn = <T,>(set: Set<T> | null, all: T[], value: T): Set<T> | null => {
    const next = new Set(set ?? all);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next.size === all.length ? null : next;
  };

  const openFiles = (list: FileList | null) => {
    const files = Array.from(list ?? []);
    if (files.length) callbacks.current.onOpenFiles?.(files);
  };

  return (
    <div
      className="relative h-full w-full"
      data-testid="canvas-3d"
      data-export-ignore
      onDragEnter={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          setDragging(true);
        }
      }}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) e.preventDefault();
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        openFiles(e.dataTransfer.files);
      }}
    >
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
      {dragging && (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm"
          style={{ background: "var(--lens-accent-soft)", color: "var(--text-primary)", border: "2px dashed var(--lens-accent)" }}
        >
          Drop a model — an archive or SL. It stays on this device.
        </div>
      )}

      <div className="absolute left-3 top-3 flex items-start gap-2">
        <button
          type="button"
          className="px-2 py-1 text-[11px]"
          style={{ ...chromeStyle, color: anyFilter ? "var(--text-primary)" : "var(--text-secondary)" }}
          aria-expanded={menuOpen}
          aria-controls="filter-3d"
          onClick={() => setMenuOpen((v) => !v)}
        >
          Filter{anyFilter ? " ·" : ""}
        </button>
        {menuOpen && (
          <div id="filter-3d" className="flex max-h-72 w-56 flex-col gap-2 overflow-y-auto px-2.5 py-2 text-[11px]" style={chromeStyle}>
            <FilterGroup
              title="Kind"
              items={kindsPresent.map((k) => ({ key: k, label: k, on: kinds === null || kinds.has(k) }))}
              onToggle={(k) => setKinds((s) => toggleIn(s, kindsPresent, k as Kind))}
            />
            <FilterGroup
              title="Environment"
              items={envs.map((e) => ({ key: String(e.id), label: e.name, on: envIds === null || envIds.has(e.id) }))}
              onToggle={(k) => setEnvIds((s) => toggleIn(s, envs.map((e) => e.id), Number(k)))}
            />
            <FilterGroup
              title="Port"
              items={scene.ports.map((p) => ({ key: p.key, label: p.protocol || p.key, on: portKeys === null || portKeys.has(p.key) }))}
              onToggle={(k) => setPortKeys((s) => toggleIn(s, scene.ports.map((p) => p.key), k))}
            />
            {anyFilter && (
              <button
                type="button"
                className="self-start px-1 text-[11px]"
                style={{ color: "var(--accent)" }}
                onClick={() => {
                  setKinds(null);
                  setEnvIds(null);
                  setPortKeys(null);
                }}
              >
                show all
              </button>
            )}
          </div>
        )}
      </div>

      <div className="absolute bottom-3 left-3 flex items-center gap-3 px-2.5 py-1 text-[11px]" style={chromeStyle}>
        <label className="flex items-center gap-1.5">
          <span>Explode</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(explode * 100)}
            onChange={(e) => setExplode(Number(e.target.value) / 100)}
            aria-label="Explode the system apart"
            data-testid="explode-3d"
          />
          <span className="tabular w-7 text-right">{Math.round(explode * 100)}%</span>
        </label>
        {shell === "capsule" && (
          <>
            <label className="flex items-center gap-1.5" title="The shell's profile along the axis, round to square">
              <span>Profile</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(squareness * 100)}
                onChange={(e) => setSquareness(Number(e.target.value) / 100)}
                aria-label="Shell profile, round to square"
                data-testid="shape-3d"
                disabled={box}
              />
            </label>
            <label className="flex items-center gap-1.5" title="The shell's cross-section, round to square">
              <span>Section</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(crossSquareness * 100)}
                onChange={(e) => setCrossSquareness(Number(e.target.value) / 100)}
                aria-label="Shell cross-section, round to square"
                data-testid="section-3d"
                disabled={box}
              />
            </label>
            <label className="flex items-center gap-1" title="A hard-edged box instead of the dials">
              <input type="checkbox" checked={box} onChange={(e) => setBox(e.target.checked)} data-testid="box-3d" />
              <span>box</span>
            </label>
          </>
        )}
        <button type="button" className="px-1" style={{ color: "var(--text-secondary)" }} onClick={() => adapterRef.current?.fit()} title="Fit the model (Home)">
          fit
        </button>
        {onOpenFiles && (
          <>
            <button type="button" className="px-1" style={{ color: "var(--text-secondary)" }} onClick={() => fileRef.current?.click()} title="Open an archive or SL file">
              open
            </button>
            <input ref={fileRef} type="file" accept=".json,.sl,application/json,text/plain" multiple hidden onChange={(e) => openFiles(e.target.files)} data-testid="open-3d" />
          </>
        )}
      </div>
    </div>
  );
}

function FilterGroup({
  title,
  items,
  onToggle,
}: {
  title: string;
  items: { key: string; label: string; on: boolean }[];
  onToggle: (key: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
        {title}
      </div>
      {items.map((it) => (
        <label key={it.key} className="flex items-center gap-1.5">
          <input type="checkbox" checked={it.on} onChange={() => onToggle(it.key)} />
          <span className="truncate" style={{ color: it.on ? "var(--text-primary)" : "var(--text-muted)" }}>
            {it.label}
          </span>
        </label>
      ))}
    </div>
  );
}

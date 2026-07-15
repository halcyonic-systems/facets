import { useEffect, useRef, useState } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import type { Lens, Thing } from "../kernel/types";
import { PRIMITIVE_BADGE } from "../kernel/types";

export type ThingNodeData = {
  thing: Thing;
  lens: Lens;
  editing: boolean;
  onRename: (id: number, name: string) => void;
  onStopEditing: () => void;
};

export type ThingNodeType = Node<ThingNodeData, "thing">;

const SIZE = 64;

/** Circle at Klir (everyone), circle for components / square for environment
 * things at Bunge+Mobus. The one node component that reads differently per
 * lens — no legality logic, just how the same Thing draws. */
export function ThingNode({ data, selected }: NodeProps<ThingNodeType>) {
  const { thing, lens, editing, onRename, onStopEditing } = data;
  const [draft, setDraft] = useState(thing.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(thing.name);
      requestAnimationFrame(() => inputRef.current?.select());
    }
  }, [editing, thing.name]);

  const isSquare = lens !== "Klir" && thing.role === "Environment";
  const isComponent = thing.role === "Component";
  const showHalo = lens !== "Klir" && isComponent;
  const badge = lens === "Mobus" && thing.primitive ? PRIMITIVE_BADGE[thing.primitive] : null;

  function commit() {
    onRename(thing.id, draft.trim() || thing.name);
    onStopEditing();
  }

  return (
    <div className="relative flex items-center justify-center" style={{ width: SIZE, height: SIZE }}>
      <Handle
        type="target"
        position={Position.Left}
        id="tgt"
        style={{ left: -2 }}
      />

      {showHalo && (
        <div
          className="absolute rounded-full"
          style={{
            width: SIZE + 20,
            height: SIZE + 20,
            background: "var(--accent-indigo)",
            opacity: 0.14,
            filter: "blur(2px)",
          }}
        />
      )}

      <div
        className="absolute inset-0 flex items-center justify-center transition-shadow"
        style={{
          borderRadius: isSquare ? "var(--radius-md)" : "9999px",
          background: "var(--bg-secondary)",
          border: `2px solid ${selected ? "var(--accent)" : "var(--border)"}`,
          boxShadow: selected ? "var(--shadow-card-hover)" : "var(--shadow-card)",
        }}
      >
        <span
          className="font-display select-none text-center leading-none"
          style={{ fontSize: 11, color: "var(--text-secondary)", padding: 4 }}
        >
          {lens !== "Klir" && !isComponent ? "env" : ""}
        </span>
      </div>

      {badge && (
        <div
          className="absolute flex items-center justify-center font-mono select-none"
          style={{
            top: -6,
            right: -6,
            width: 20,
            height: 20,
            borderRadius: "9999px",
            background: "var(--accent)",
            color: "var(--bg-secondary)",
            fontSize: 9,
            fontWeight: 600,
            boxShadow: "var(--shadow-card)",
          }}
        >
          {badge}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        id="src"
        style={{ right: -2 }}
      />

      <div
        className="absolute text-center select-none"
        style={{ top: SIZE + 6, width: SIZE * 2.2, left: -SIZE * 0.6 }}
      >
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") onStopEditing();
            }}
            className="w-full text-center outline-none nodrag"
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 12,
              background: "var(--bg-secondary)",
              border: "1px solid var(--accent)",
              borderRadius: "var(--radius-sm)",
              padding: "2px 4px",
              color: "var(--text-primary)",
            }}
          />
        ) : (
          <span style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 500 }}>{thing.name}</span>
        )}
      </div>
    </div>
  );
}

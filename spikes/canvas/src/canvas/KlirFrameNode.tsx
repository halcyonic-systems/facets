import type { NodeProps, Node } from "@xyflow/react";

export type KlirFrameData = { width: number; height: number };
export type KlirFrameNodeType = Node<KlirFrameData, "klirFrame">;

/** Klir's container box: everything is just a thing in T. Non-interactive,
 * drawn behind the accretion, faint. */
export function KlirFrameNode({ data }: NodeProps<KlirFrameNodeType>) {
  return (
    <div
      style={{
        width: data.width,
        height: data.height,
        borderRadius: "var(--radius-lg)",
        border: "1.5px dashed var(--border)",
        background: "var(--bg-surface)",
        opacity: 0.5,
        position: "relative",
      }}
    >
      <span
        className="select-none font-display"
        style={{
          position: "absolute",
          top: 8,
          left: 12,
          fontSize: 20,
          color: "var(--text-muted)",
        }}
      >
        T
      </span>
    </div>
  );
}

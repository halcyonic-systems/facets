// The canvas popovers' dialog semantics (makeover rule 15): the edge, boundary,
// interface and milieu editors open as `role="dialog"` with a label, take
// focus on open (the first field or button, else the dialog itself), close on
// Escape from inside, and hand focus back to where it came from on close.
// Presentation and focus only: the shared `Popover` in ui.tsx still places and
// clamps the box (8px radius, a hairline edge, no shadow); the shell still owns
// what "close" means. Written here rather than in ui.tsx because another
// makeover slice owns that file.
import { useEffect, useRef, type ReactNode } from "react";
import { Popover } from "../ui";

const FOCUSABLE = 'input, select, textarea, button, [href], [tabindex]:not([tabindex="-1"])';

export function PopoverDialog({
  x,
  y,
  width,
  label,
  onClose,
  prefer,
  children,
}: {
  x: number;
  y: number;
  width: number;
  /** The accessible name: what this dialog edits. */
  label: string;
  onClose: () => void;
  prefer?: "below" | "right";
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const el = ref.current;
    const first = el?.querySelector<HTMLElement>(FOCUSABLE) ?? el;
    first?.focus({ preventScroll: true });
    return () => {
      if (opener && opener.isConnected && typeof opener.focus === "function") opener.focus({ preventScroll: true });
    };
  }, []);
  return (
    <Popover x={x} y={y} width={width} prefer={prefer}>
      <div
        ref={ref}
        role="dialog"
        aria-label={label}
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
      >
        {children}
      </div>
    </Popover>
  );
}

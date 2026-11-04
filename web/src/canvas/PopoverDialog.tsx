// The canvas popovers' dialog semantics (makeover rule 15): the edge, boundary,
// interface and milieu editors open as `role="dialog"` with a label, take
// focus on open (the first field or button, else the dialog itself), close on
// Escape from inside, and hand focus back to where it came from on close.
// Presentation and focus only: the shared `Popover` in ui.tsx still places and
// clamps the box (8px radius, a hairline edge, no shadow); the shell still owns
// what "close" means. Written here rather than in ui.tsx because another
// makeover slice owns that file.
import { useEffect, useRef, type ReactNode, createContext, useContext } from "react";
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

/** True inside a docked editor: its own header carries the close, so an
 *  editor body's bottom close row stands down. */
export const DockedContext = createContext(false);
export const useDocked = () => useContext(DockedContext);

/** The same editor, floating at the click (`at` given) or docked in the
 *  inspector's Element tab (`at` absent; Shingai, 2026-11-02: "let's go
 *  inspector"). Docked, it is a labelled region with its own close, and it
 *  does not take focus: the click that opened it stays on the canvas. */
export function DockOrPopover({
  at,
  width,
  label,
  title,
  onClose,
  children,
}: {
  at?: { x: number; y: number };
  width: number;
  label: string;
  /** Docked only: the heading that says what is open. */
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  if (at) {
    return (
      <PopoverDialog x={at.x} y={at.y} width={width} label={label} onClose={onClose}>
        {children}
      </PopoverDialog>
    );
  }
  return (
    <section aria-label={label} data-testid="docked-editor" className="text-xs">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
          {title}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={`close ${label}`}
          className="rounded-sm px-1 text-[11px]"
          style={{ color: "var(--text-muted)" }}
        >
          close
        </button>
      </div>
      <DockedContext.Provider value={true}>{children}</DockedContext.Provider>
    </section>
  );
}

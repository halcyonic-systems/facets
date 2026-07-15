import { useEffect, useRef, useState } from "react";

/** Rolling ~500ms fps counter driven off requestAnimationFrame. Kill-criteria instrumentation. */
export function useFps(): number {
  const [fps, setFps] = useState(60);
  const frames = useRef<number[]>([]);

  useEffect(() => {
    let raf = 0;
    const tick = (t: number) => {
      const buf = frames.current;
      buf.push(t);
      while (buf.length > 0 && t - buf[0] > 500) buf.shift();
      if (buf.length > 1) {
        const dt = buf[buf.length - 1] - buf[0];
        setFps(Math.round(((buf.length - 1) * 1000) / dt));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return fps;
}

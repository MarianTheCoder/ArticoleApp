import { useEffect, useState } from "react";

// Tracks DOM element size for the Konva Stage.
export function useElementSize(ref) {
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = ref.current;

    if (!el) return;

    // Read current element size.
    const update = () => {
      const rect = el.getBoundingClientRect();

      setSize({
        w: Math.max(0, Math.round(rect.width)),
        h: Math.max(0, Math.round(rect.height)),
      });
    };

    // Initial size.
    update();

    // Watch layout changes.
    const ro = new ResizeObserver(update);
    ro.observe(el);

    return () => {
      ro.disconnect();
    };
  }, [ref]);

  return size;
}

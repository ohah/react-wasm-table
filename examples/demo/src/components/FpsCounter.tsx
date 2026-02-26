import { useEffect, useState, useRef } from "react";

const UPDATE_INTERVAL_MS = 200;

export function FpsCounter() {
  const [fps, setFps] = useState(0);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const rafRef = useRef<number>(0);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;

    const tick = () => {
      frameCountRef.current += 1;
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    intervalId = setInterval(() => {
      const now = performance.now();
      const elapsed = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      const count = frameCountRef.current;
      frameCountRef.current = 0;
      setFps(elapsed > 0 ? Math.round(count / elapsed) : 0);
    }, UPDATE_INTERVAL_MS);

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearInterval(intervalId);
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: 9999,
        padding: "6px 12px",
        fontFamily: "monospace",
        fontSize: 14,
        fontWeight: 600,
        color: "#333",
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        border: "1px solid #e0e0e0",
        borderRadius: 6,
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      }}
    >
      {fps} FPS
    </div>
  );
}

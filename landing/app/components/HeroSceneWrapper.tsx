"use client";

import { useState, useEffect, type ComponentType } from "react";

export default function HeroSceneWrapper() {
  const [Scene, setScene] = useState<ComponentType | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("./HeroScene").then((mod) => {
      if (!cancelled) setScene(() => mod.default);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!Scene) return null;

  return <Scene />;
}

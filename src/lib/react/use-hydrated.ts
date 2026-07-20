"use client";

import { useEffect, useState } from "react";

export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const timeoutId = window.setTimeout(() => setHydrated(true), 0);
    return () => window.clearTimeout(timeoutId);
  }, []);
  return hydrated;
}

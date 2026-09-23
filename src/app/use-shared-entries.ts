"use client";

import { useEffect, useRef, useState } from "react";
import { decodeEntries, encodeEntries, type SharedEntry } from "../lib/share";

export function useSharedEntries(initial: () => SharedEntry[]) {
  const [entries, setEntries] = useState(initial);
  const [ready, setReady] = useState(false);
  const [urlError, setUrlError] = useState("");
  const lastSnapshot = useRef("");

  useEffect(() => {
    function restore() {
      try {
        const restored = decodeEntries(window.location.hash) ?? initial();
        lastSnapshot.current = window.location.hash ? JSON.stringify(restored) : "";
        setEntries(restored);
        setUrlError("");
      } catch (error) {
        const fallback = initial();
        lastSnapshot.current = JSON.stringify(fallback);
        setEntries(fallback);
        setUrlError((error as Error).message);
      }
      setReady(true);
    }
    restore();
    window.addEventListener("hashchange", restore);
    window.addEventListener("popstate", restore);
    return () => {
      window.removeEventListener("hashchange", restore);
      window.removeEventListener("popstate", restore);
    };
  }, [initial]);

  useEffect(() => {
    if (!ready) return;
    const snapshot = JSON.stringify(entries);
    if (snapshot === lastSnapshot.current) return;
    // Coalesce rapid typing to avoid browser History API frequency limits.
    const timer = setTimeout(() => {
      try {
        const hash = encodeEntries(entries);
        window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}${hash}`);
        lastSnapshot.current = snapshot;
        setUrlError("");
      } catch (error) {
        setUrlError(error instanceof Error ? error.message : "URL を更新できませんでした。");
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [entries, ready]);

  return { entries, setEntries, urlError };
}

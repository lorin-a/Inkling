"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The playtest record. Every action lands in data/playtest/<session>.jsonl so
 * a session is reviewed from a record rather than from memory. A tester
 * (Playwright, Claude) announces itself with ?tester=<name> and its sessions
 * are routed to a separate directory, so hers are never mixed with mine.
 */
export default function useEventLog(who) {
  const queue = useRef([]);
  const session = useRef(null);
  const [sessionId, setSessionId] = useState(null);
  const whoRef = useRef(who);
  useEffect(() => { whoRef.current = who; }, [who]);
  const testerRef = useRef(null);

  useEffect(() => {
    const tester = new URLSearchParams(window.location.search).get("tester");
    testerRef.current = tester;
    const key = tester ? "inkling-playtest-session-tester" : "inkling-playtest-session";
    let s = window.localStorage.getItem(key);
    if (!s || (tester && !s.startsWith("claude-"))) {
      const stamp = `${new Date().toISOString().slice(0, 10)}-${Math.random().toString(36).slice(2, 6)}`;
      s = tester ? `claude-${stamp}` : `pt01-${stamp}`;
      window.localStorage.setItem(key, s);
    }
    session.current = s;
    setSessionId(s);
  }, []);

  const flush = useCallback((useBeacon = false) => {
    if (!queue.current.length || !session.current) return;
    const body = JSON.stringify({ session: session.current, events: queue.current });
    queue.current = [];
    if (useBeacon && navigator.sendBeacon) {
      navigator.sendBeacon("/api/studio/log", new Blob([body], { type: "application/json" }));
    } else {
      fetch("/api/studio/log", { method: "POST", headers: { "Content-Type": "application/json" }, body }).catch(() => {});
    }
  }, []);

  const log = useCallback((type, payload = {}) => {
    const who = testerRef.current ? `tester:${testerRef.current}` : whoRef.current;
    queue.current.push({ type, ...payload, who, at: new Date().toISOString() });
    if (queue.current.length >= 12) flush();
  }, [flush]);

  useEffect(() => {
    const id = setInterval(() => flush(), 4000);
    const bye = () => flush(true);
    window.addEventListener("pagehide", bye);
    return () => { clearInterval(id); window.removeEventListener("pagehide", bye); flush(true); };
  }, [flush]);

  return { log, session: sessionId };
}

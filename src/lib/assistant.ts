// Where the FastAPI portfolio assistant lives. NEXT_PUBLIC_ASSISTANT_API_URL is
// inlined at build time. Without it, the local default is only used when the
// site itself runs on localhost, so production visitors are never pointed at
// their own machine.
const LOCAL_DEFAULT = "http://127.0.0.1:8001";

export function assistantBaseUrl(): string | null {
  const configured = process.env.NEXT_PUBLIC_ASSISTANT_API_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  if (typeof window !== "undefined") {
    // On localhost, point to the local backend port.
    if (["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname)) return LOCAL_DEFAULT;
    // On Vercel (same domain), the rewrites route /api/* to the backend service.
    return window.location.origin;
  }
  return null;
}

export type AssistantStatus = "awake" | "offline" | "timeout";

/**
 * One GET /health, held open until the backend answers or the deadline passes.
 * Hosted FastAPI services that sleep keep the request waiting while they wake,
 * so how long this takes is how long the backend takes to load (and it warms
 * the chat up). A refused connection fails fast: the backend is offline, so
 * there's nothing to wait for. Uses no-cors because only "did it answer"
 * matters, which works even if this origin isn't in the backend's CORS list.
 */
export async function waitForAssistant(baseUrl: string, deadline: number, signal?: AbortSignal): Promise<AssistantStatus> {
  const attempt = new AbortController();
  let timedOut = false;
  const stop = () => attempt.abort();
  signal?.addEventListener("abort", stop, { once: true });
  const timer = window.setTimeout(() => { timedOut = true; attempt.abort(); }, Math.max(0, deadline - Date.now()));
  try {
    await fetch(`${baseUrl}/health`, { mode: "no-cors", cache: "no-store", signal: attempt.signal });
    return "awake";
  } catch {
    return timedOut ? "timeout" : "offline";
  } finally {
    window.clearTimeout(timer);
    signal?.removeEventListener("abort", stop);
  }
}

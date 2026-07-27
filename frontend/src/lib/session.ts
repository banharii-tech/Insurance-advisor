export interface DemoSession {
  sessionId: string;
  createdAt: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function createDemoSession(): Promise<DemoSession> {
  const response = await fetch(`${API_URL}/api/demo-sessions`, {
    method: "POST",
  });
  const body = (await response.json().catch(() => null)) as
    | DemoSession
    | { detail?: string }
    | null;

  if (!response.ok) {
    throw new Error(
      body && "detail" in body && body.detail
        ? body.detail
        : "The demo platform is temporarily unavailable. Please try again.",
    );
  }

  return body as DemoSession;
}

export async function endDemoSession(sessionId: string): Promise<void> {
  const response = await fetch(
    `${API_URL}/api/demo-sessions/${encodeURIComponent(sessionId)}`,
    { method: "DELETE" },
  );

  if (!response.ok) {
    throw new Error("The demo session could not be closed.");
  }
}

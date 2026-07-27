import type { PlanningProfile } from "@/types/planning";

export interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
}

interface ChatApiResponse {
  assistantMessage: string;
  profile: PlanningProfile | null;
  missingFields: string[];
  readyForReview: boolean;
}

const CHAT_API_URL =
  process.env.NEXT_PUBLIC_CHAT_API_URL ?? "http://localhost:8000/api/chat";

export async function sendChatMessages(
  messages: ChatMessage[],
): Promise<ChatApiResponse> {
  const response = await fetch(CHAT_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: messages.map(({ role, content }) => ({ role, content })),
    }),
  });

  const body = (await response.json().catch(() => null)) as
    | ChatApiResponse
    | { detail?: string }
    | null;

  if (!response.ok) {
    throw new Error(
      body && "detail" in body && body.detail
        ? body.detail
        : "The planning assistant is temporarily unavailable. Please try again.",
    );
  }

  return body as ChatApiResponse;
}

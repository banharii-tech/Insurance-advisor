import type { PlanEvaluation, PlanningProfile } from "@/types/planning";

export interface AccountUser {
  userId: string;
  displayName: string;
  email: string;
}

export interface AuthSession {
  sessionId: string;
  createdAt: string;
  user: AccountUser;
}

export type SummaryType =
  | "hospitalisation"
  | "critical_illness"
  | "combined";

export interface SuggestionDraft {
  suggestionId: string;
  title: string;
  summaryType: SummaryType;
  profile: PlanningProfile;
  evaluations: PlanEvaluation[];
  recommendedPlanName: string | null;
  createdAt: string;
}

export interface SuggestionDraftInput {
  title: string;
  summaryType: SummaryType;
  profile: PlanningProfile;
  evaluations: PlanEvaluation[];
  recommendedPlanName: string | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function readApiResponse<ResponseBody>(
  response: Response,
  fallback: string,
): Promise<ResponseBody> {
  const body = (await response.json().catch(() => null)) as
    | ResponseBody
    | { detail?: string }
    | null;
  if (!response.ok) {
    throw new Error(
      body && typeof body === "object" && "detail" in body && body.detail
        ? body.detail
        : fallback,
    );
  }
  return body as ResponseBody;
}

export async function signUp(
  displayName: string,
  email: string,
  password: string,
): Promise<AuthSession> {
  const response = await fetch(`${API_URL}/api/auth/sign-up`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ displayName, email, password }),
  });
  return readApiResponse(
    response,
    "The account could not be created. Please try again.",
  );
}

export async function signIn(
  email: string,
  password: string,
): Promise<AuthSession> {
  const response = await fetch(`${API_URL}/api/auth/sign-in`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return readApiResponse(
    response,
    "The account could not be signed in. Please try again.",
  );
}

export async function signOut(sessionId: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/auth/sessions/current`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${sessionId}` },
  });
  if (!response.ok) {
    throw new Error("The temporary session could not be closed.");
  }
}

export async function listSuggestions(
  sessionId: string,
): Promise<SuggestionDraft[]> {
  const response = await fetch(`${API_URL}/api/suggestions`, {
    headers: { Authorization: `Bearer ${sessionId}` },
  });
  return readApiResponse(
    response,
    "Saved drafts are temporarily unavailable.",
  );
}

export async function saveSuggestion(
  sessionId: string,
  suggestion: SuggestionDraftInput,
): Promise<SuggestionDraft> {
  const response = await fetch(`${API_URL}/api/suggestions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sessionId}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(suggestion),
  });
  return readApiResponse(
    response,
    "The suggestion could not be saved as a draft.",
  );
}

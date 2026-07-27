"use client";

import { FormEvent, useState } from "react";

import InsurancePlanner from "@/components/insurance-planner";
import {
  type AuthSession,
  listSuggestions,
  saveSuggestion,
  signIn,
  signOut,
  signUp,
  type SuggestionDraft,
  type SuggestionDraftInput,
} from "@/lib/session";

import styles from "./platform-shell.module.css";

function Brand() {
  return (
    <span className="brand">
      <span className="brand-mark">CC</span>
      <span>
        <strong>ClearCover</strong>
        <small>Singapore planning prototype</small>
      </span>
    </span>
  );
}

function AccountAccess({
  onAuthenticated,
  notice,
}: {
  onAuthenticated: (session: AuthSession) => Promise<void>;
  notice?: string;
}) {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [state, setState] = useState<"idle" | "working" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const switchMode = (nextMode: "sign-in" | "sign-up") => {
    setMode(nextMode);
    setState("idle");
    setErrorMessage("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState("working");
    setErrorMessage("");

    try {
      if (mode === "sign-up" && password !== confirmPassword) {
        throw new Error("The passwords do not match.");
      }
      const session =
        mode === "sign-up"
          ? await signUp(displayName.trim(), email.trim(), password)
          : await signIn(email.trim(), password);
      await onAuthenticated(session);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The temporary account service is unavailable.",
      );
      setState("error");
    }
  };

  return (
    <main className={styles.loginPage}>
      <section className={styles.loginIntroduction}>
        <Brand />
        <p className="eyebrow">Your private prototype workspace</p>
        <h1>
          Plan clearly.
          <em> Return confidently.</em>
        </h1>
        <p>
          Create a temporary local account to revisit fictional suggestions
          and draft documents while this server is running.
        </p>
        <ul>
          <li>Separate user workspaces</li>
          <li>Salted password hashing</li>
          <li>Drafts reset with the server</li>
        </ul>
      </section>

      <section className={styles.loginCard} aria-labelledby="login-heading">
        <span className={styles.demoBadge}>Temporary account access</span>
        <h2 id="login-heading">
          {mode === "sign-in" ? "Welcome back" : "Create your workspace"}
        </h2>
        <p>
          Accounts, sessions, and saved drafts stay only in the disposable
          local database and are cleared when the server restarts.
        </p>

        <div className={styles.authTabs} aria-label="Account access">
          <button
            className={mode === "sign-in" ? styles.activeTab : ""}
            type="button"
            onClick={() => switchMode("sign-in")}
          >
            Sign in
          </button>
          <button
            className={mode === "sign-up" ? styles.activeTab : ""}
            type="button"
            onClick={() => switchMode("sign-up")}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === "sign-up" && (
            <label>
              Display name
              <input
                type="text"
                value={displayName}
                onChange={(event) =>
                  setDisplayName(event.currentTarget.value)
                }
                autoComplete="name"
                minLength={2}
                maxLength={80}
                required
              />
            </label>
          )}
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.currentTarget.value)}
              autoComplete="email"
              maxLength={254}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.currentTarget.value)}
              autoComplete={
                mode === "sign-up" ? "new-password" : "current-password"
              }
              minLength={8}
              maxLength={128}
              required
            />
          </label>
          {mode === "sign-up" && (
            <label>
              Confirm password
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.currentTarget.value)
                }
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                required
              />
            </label>
          )}
          <small>
            Use prototype-only credentials. Do not reuse a real password.
          </small>
          <button
            type="submit"
            aria-label={
              mode === "sign-in"
                ? "Sign in to workspace"
                : "Create account"
            }
            disabled={state === "working"}
          >
            {state === "working"
              ? "Opening workspace…"
              : mode === "sign-in"
                ? "Sign in"
                : "Create account"}
            <span aria-hidden="true">→</span>
          </button>
        </form>

        {state === "error" && (
          <p className={styles.loginError} role="alert">
            {errorMessage}
          </p>
        )}
        {notice && (
          <p className={styles.loginNotice} role="status">
            {notice}
          </p>
        )}
      </section>
    </main>
  );
}

function DraftHistory({
  drafts,
  state,
}: {
  drafts: SuggestionDraft[];
  state: "loading" | "ready" | "error";
}) {
  const [downloadError, setDownloadError] = useState("");

  const handleDownload = async (draft: SuggestionDraft) => {
    setDownloadError("");
    try {
      const { downloadPlanningSummary } = await import("@/lib/download");
      await downloadPlanningSummary(draft.profile, draft.evaluations);
    } catch {
      setDownloadError(
        "This draft PDF could not be prepared. Please try again.",
      );
    }
  };

  return (
    <section className={styles.history} aria-labelledby="history-heading">
      <div className={styles.historyHeading}>
        <div>
          <p className="eyebrow">Document history</p>
          <h2 id="history-heading">Your saved draft suggestions</h2>
          <span>
            Each comparison is private to this temporary account and remains
            available only until the server restarts.
          </span>
        </div>
        <a href="#planner-heading">Plan a new comparison</a>
      </div>

      {state === "loading" && (
        <p className={styles.historyStatus} role="status">
          Loading your drafts…
        </p>
      )}
      {state === "error" && (
        <p className={styles.historyError} role="alert">
          Saved drafts are temporarily unavailable. New comparisons can still
          be created.
        </p>
      )}
      {state === "ready" && drafts.length === 0 && (
        <div className={styles.emptyHistory}>
          <strong>No saved drafts yet</strong>
          <p>
            Complete your first fictional comparison and it will appear here.
          </p>
        </div>
      )}
      {drafts.length > 0 && (
        <div className={styles.draftGrid}>
          {drafts.map((draft) => (
            <article key={draft.suggestionId}>
              <span>Draft only</span>
              <h3>{draft.title}</h3>
              <p>
                {draft.recommendedPlanName
                  ? `Fictional result: ${draft.recommendedPlanName}`
                  : "No fictional plan met every selected criterion."}
              </p>
              <small>
                {new Date(draft.createdAt).toLocaleString("en-SG", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </small>
              <button
                type="button"
                onClick={() => void handleDownload(draft)}
              >
                Download draft PDF <span aria-hidden="true">↓</span>
              </button>
            </article>
          ))}
        </div>
      )}
      {downloadError && (
        <p className={styles.historyError} role="alert">
          {downloadError}
        </p>
      )}
    </section>
  );
}

export default function PlatformShell() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [drafts, setDrafts] = useState<SuggestionDraft[]>([]);
  const [historyState, setHistoryState] = useState<
    "loading" | "ready" | "error"
  >("ready");
  const [entryNotice, setEntryNotice] = useState("");

  const handleAuthenticated = async (nextSession: AuthSession) => {
    setSession(nextSession);
    setHistoryState("loading");
    try {
      setDrafts(await listSuggestions(nextSession.sessionId));
      setHistoryState("ready");
    } catch {
      setDrafts([]);
      setHistoryState("error");
    }
  };

  if (!session) {
    return (
      <AccountAccess
        notice={entryNotice}
        onAuthenticated={handleAuthenticated}
      />
    );
  }

  const handleSignOut = async () => {
    setEntryNotice("");
    try {
      await signOut(session.sessionId);
    } catch {
      setEntryNotice(
        "The server session could not be removed, but this browser session was closed.",
      );
    } finally {
      setSession(null);
      setDrafts([]);
    }
  };

  const handleSuggestionCreated = async (
    suggestion: SuggestionDraftInput,
  ) => {
    const saved = await saveSuggestion(session.sessionId, suggestion);
    setDrafts((current) => [
      saved,
      ...current.filter(
        (draft) => draft.suggestionId !== saved.suggestionId,
      ),
    ]);
    setHistoryState("ready");
  };

  const initials = session.user.displayName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <header className="site-header">
        <a href="#top" aria-label="ClearCover home">
          <Brand />
        </a>
        <nav className={styles.workspaceNav} aria-label="Workspace">
          <a href="#history-heading">Documents</a>
          <a href="#planner-heading">New plan</a>
        </nav>
        <div className={styles.sessionControls}>
          <span className={styles.avatar} aria-hidden="true">
            {initials}
          </span>
          <span>
            <strong>{session.user.displayName}</strong>
            <small>{session.user.email}</small>
          </span>
          <button type="button" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">Fictional insurance planning · Singapore</p>
            <h1 id="hero-title">
              Understand the match.
              <br />
              <em>Keep the choice yours.</em>
            </h1>
            <p className="hero-description">
              Create transparent fictional comparisons, save each draft to
              your temporary workspace, and return to prior documents while
              the server is running.
            </p>
          </div>

          <aside className="prototype-note">
            <span>Draft-only prototype</span>
            <strong>Not financial advice.</strong>
            <p>
              Every suggestion and document is a draft for learning purposes.
              Providers, plans, premiums, and coverage amounts are fictional
              and require professional review before any decision.
            </p>
          </aside>
        </section>

        <DraftHistory drafts={drafts} state={historyState} />

        <InsurancePlanner
          sessionId={session.sessionId}
          onSuggestionCreated={handleSuggestionCreated}
        />

        <section className="principles" aria-labelledby="principles-heading">
          <div>
            <p className="eyebrow">Built for clarity</p>
            <h2 id="principles-heading">Three checks. No black box.</h2>
          </div>
          <ol>
            <li>
              <span>01</span>
              <strong>Age range</strong>
              <p>Is the entered age within the fictional plan range?</p>
            </li>
            <li>
              <span>02</span>
              <strong>Coverage needs</strong>
              <p>Does the plan include every selected category?</p>
            </li>
            <li>
              <span>03</span>
              <strong>Annual budget</strong>
              <p>Is the fictional annual premium within budget?</p>
            </li>
          </ol>
        </section>
      </main>

      <footer>
        <div className="footer-brand">
          <Brand />
        </div>
        <p>
          All suggestions and documents are drafts only. This demonstration
          does not assess real eligibility, underwriting, exclusions, pricing,
          claims, or policy terms. Verify official information and speak with
          an appropriately licensed professional.
        </p>
        <span>Prototype · 2026</span>
      </footer>
    </>
  );
}

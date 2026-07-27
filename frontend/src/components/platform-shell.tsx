"use client";

import { FormEvent, useState } from "react";

import InsurancePlanner from "@/components/insurance-planner";
import {
  createDemoSession,
  endDemoSession,
  type DemoSession,
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

function DemoLogin({
  onSignedIn,
  notice,
}: {
  onSignedIn: (session: DemoSession) => void;
  notice?: string;
}) {
  const [state, setState] = useState<"idle" | "working" | "error">("idle");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState("working");

    try {
      onSignedIn(await createDemoSession());
    } catch {
      setState("error");
    }
  };

  return (
    <main className={styles.loginPage}>
      <section className={styles.loginIntroduction}>
        <Brand />
        <p className="eyebrow">V1 technical foundation</p>
        <h1>
          A clearer way to explore
          <em> fictional cover.</em>
        </h1>
        <p>
          Enter the temporary demo platform to try the guided planning
          experience. This screen does not authenticate you or create a real
          account.
        </p>
        <ul>
          <li>Temporary session only</li>
          <li>No real customer or insurer data</li>
          <li>Not financial advice</li>
        </ul>
      </section>

      <section className={styles.loginCard} aria-labelledby="login-heading">
        <span className={styles.demoBadge}>Demo access</span>
        <h2 id="login-heading">Sign in to ClearCover</h2>
        <p>
          The credentials are fixed placeholders. Clicking continue only
          creates a disposable local session—there is no authentication.
        </p>

        <form onSubmit={handleSubmit}>
          <label>
            Demo email
            <input
              type="email"
              value="demo@clearcover.test"
              readOnly
              aria-describedby="demo-credentials-note"
            />
          </label>
          <label>
            Demo password
            <input type="password" value="demo-access" readOnly />
          </label>
          <small id="demo-credentials-note">
            Do not enter real credentials or personal information.
          </small>
          <button type="submit" disabled={state === "working"}>
            {state === "working" ? "Opening demo…" : "Continue to demo"}
            <span aria-hidden="true">→</span>
          </button>
        </form>

        {state === "error" && (
          <p className={styles.loginError} role="alert">
            The local demo service is unavailable. Start the platform and try
            again.
          </p>
        )}
        {notice && (
          <p className={styles.loginError} role="status">
            {notice}
          </p>
        )}
      </section>
    </main>
  );
}

export default function PlatformShell() {
  const [session, setSession] = useState<DemoSession | null>(null);
  const [entryNotice, setEntryNotice] = useState("");

  if (!session) {
    return <DemoLogin notice={entryNotice} onSignedIn={setSession} />;
  }

  const handleSignOut = async () => {
    setEntryNotice("");
    try {
      await endDemoSession(session.sessionId);
    } catch {
      setEntryNotice(
        "The temporary server session could not be removed, but this browser session was closed.",
      );
    } finally {
      setSession(null);
    }
  };

  return (
    <>
      <header className="site-header">
        <a href="#top" aria-label="ClearCover home">
          <Brand />
        </a>
        <div className={styles.sessionControls}>
          <span>
            <span aria-hidden="true" />
            Demo session
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
              Describe a few non-medical planning details in a guided chat,
              review what was understood, and compare three fictional plan
              categories using transparent rules.
            </p>
          </div>

          <aside className="prototype-note">
            <span>Learning prototype</span>
            <strong>Not financial advice.</strong>
            <p>
              Every provider, plan, premium and coverage amount shown here is
              fictional. Chat answers are processed only to fill the criteria
              you review and are not saved by this prototype.
            </p>
          </aside>
        </section>

        <InsurancePlanner />

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
          This demonstration does not assess real eligibility, underwriting,
          exclusions, pricing, claims or policy terms. Verify official
          information and speak with an appropriately licensed professional.
        </p>
        <span>Prototype · 2026</span>
      </footer>
    </>
  );
}

"use client";

import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import { FICTIONAL_PLANS } from "@/data/plans";
import { sendChatMessages, type ChatMessage } from "@/lib/chat";
import { formatSgd } from "@/lib/format";
import { evaluatePlans } from "@/lib/recommendation";
import { validateProfile } from "@/lib/validation";
import type {
  PlanEvaluation,
  PlanningProfile,
  ProfileErrors,
  ResidencyStatus,
  SpouseCitizenship,
} from "@/types/planning";

import styles from "./insurance-planner.module.css";

const INITIAL_MESSAGE: ChatMessage = {
  id: 1,
  role: "assistant",
  content:
    "Hi, I’m the ClearCover planning assistant. I can guide a fictional public hospital, critical illness, or combined comparison. Choose a planning summary below or tell me what you need.",
};

const PLAN_TYPE_CHOICES = [
  {
    value: "hospitalisation",
    label: "Public hospital",
    description: "Compare fictional plans for government-hospital coverage.",
    message: "Guide me through a public hospital insurance comparison.",
  },
  {
    value: "critical_illness",
    label: "Critical illness",
    description: "Compare fictional plans with critical illness coverage.",
    message: "Guide me through a critical illness insurance comparison.",
  },
  {
    value: "combined",
    label: "Both",
    description: "Compare fictional plans across both coverage needs.",
    message:
      "Guide me through a combined public hospital and critical illness comparison.",
  },
] as const;

const residencyOptions: ResidencyStatus[] = [
  "Singapore citizen",
  "Permanent resident",
  "Foreigner",
  "Prefer not to say",
];

const spouseOptions: SpouseCitizenship[] = [
  "Singapore citizen",
  "Permanent resident",
  "Other",
  "Not applicable",
  "Prefer not to say",
];

function CheckMark({ passed }: { passed: boolean }) {
  return (
    <span className={passed ? styles.pass : styles.fail}>
      <span aria-hidden="true">{passed ? "PASS" : "CHECK"}</span>
      <span className={styles.srOnly}>
        {passed ? "Passed" : "Did not pass"}
      </span>
    </span>
  );
}

function PlanCard({ evaluation }: { evaluation: PlanEvaluation }) {
  const statusClass =
    evaluation.status === "Recommended"
      ? styles.recommended
      : evaluation.status === "Alternative"
        ? styles.alternative
        : styles.notRecommended;

  return (
    <article
      className={`${styles.planCard} ${
        evaluation.status === "Recommended" ? styles.featuredPlan : ""
      }`}
    >
      <div className={styles.planHeader}>
        <div>
          <span className={styles.fictionalTag}>Fictional plan</span>
          <p className={styles.provider}>{evaluation.plan.providerName}</p>
          <h3>{evaluation.plan.planName}</h3>
        </div>
        <span className={`${styles.status} ${statusClass}`}>
          {evaluation.status}
        </span>
      </div>
      <div className={styles.planNumbers}>
        <div>
          <span>Annual premium</span>
          <strong>{formatSgd(evaluation.plan.annualPremiumSgd)}</strong>
        </div>
        <div>
          <span>Fictional CI cover</span>
          <strong>
            {formatSgd(evaluation.plan.criticalIllnessCoverageSgd)}
          </strong>
        </div>
      </div>
      <p className={styles.hospitalLevel}>
        {evaluation.plan.hospitalCoverageLevel}
      </p>
      <ul className={styles.criteria} aria-label="Comparison checks">
        <li>
          <span>Age range</span>
          <CheckMark passed={evaluation.ageMatch} />
        </li>
        <li>
          <span>Selected coverage</span>
          <CheckMark passed={evaluation.coverageMatch} />
        </li>
        <li>
          <span>Annual budget</span>
          <CheckMark passed={evaluation.budgetMatch} />
        </li>
      </ul>
      <p className={styles.explanation}>{evaluation.explanation}</p>
    </article>
  );
}

export default function InsurancePlanner() {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [answer, setAnswer] = useState("");
  const [profile, setProfile] = useState<PlanningProfile | null>(null);
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [evaluations, setEvaluations] = useState<PlanEvaluation[] | null>(null);
  const [chatState, setChatState] = useState<"idle" | "working" | "error">(
    "idle",
  );
  const [chatError, setChatError] = useState("");
  const [showPlanChoices, setShowPlanChoices] = useState(true);
  const [downloadState, setDownloadState] = useState<
    "idle" | "working" | "done" | "error"
  >("idle");
  const nextMessageIdRef = useRef(2);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [messages, chatState, profile]);

  const updateProfile = <Key extends keyof PlanningProfile>(
    key: Key,
    value: PlanningProfile[Key],
  ) => {
    setProfile((current) => (current ? { ...current, [key]: value } : current));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setEvaluations(null);
    setDownloadState("idle");
  };

  const sendMessage = async (content: string) => {
    if (!content || chatState === "working") return;

    const nextMessages = [
      ...messages,
      { id: nextMessageIdRef.current++, role: "user" as const, content },
    ];
    setMessages(nextMessages);
    setAnswer("");
    setChatError("");
    setChatState("working");

    try {
      const response = await sendChatMessages(nextMessages);
      setMessages((current) => [
        ...current,
        {
          id: nextMessageIdRef.current++,
          role: "assistant",
          content: response.assistantMessage,
        },
      ]);
      if (response.readyForReview && response.profile) {
        setProfile(response.profile);
      }
      setShowPlanChoices(response.needsSupportedPlanChoice);
      setChatState("idle");
    } catch (error) {
      setChatError(
        error instanceof Error
          ? error.message
          : "The planning assistant is temporarily unavailable.",
      );
      setChatState("error");
    }
  };

  const handleChatSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await sendMessage(answer.trim());
  };

  const handleComposerKeyDown = (
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  const handleCompare = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile) return;
    const nextErrors = validateProfile(profile);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      requestAnimationFrame(() => errorSummaryRef.current?.focus());
      return;
    }

    setEvaluations(evaluatePlans(profile, FICTIONAL_PLANS));
    requestAnimationFrame(() => resultsRef.current?.focus());
  };

  const handleDownload = async () => {
    if (!evaluations || !profile) return;
    setDownloadState("working");
    try {
      const { downloadPlanningSummary } = await import("@/lib/download");
      await downloadPlanningSummary(profile, evaluations);
      setDownloadState("done");
    } catch {
      setDownloadState("error");
    }
  };

  const resetConversation = () => {
    nextMessageIdRef.current = 2;
    setMessages([INITIAL_MESSAGE]);
    setAnswer("");
    setProfile(null);
    setErrors({});
    setEvaluations(null);
    setChatError("");
    setShowPlanChoices(true);
    setChatState("idle");
    setDownloadState("idle");
  };

  const recommended = evaluations?.find(
    (evaluation) => evaluation.status === "Recommended",
  );

  return (
    <section className={styles.planner} aria-labelledby="planner-heading">
      <div className={styles.stepRail} aria-label="Planning steps">
        <span className={styles.activeStep}>
          <b>1</b> Chat
        </span>
        <span className={profile ? styles.activeStep : ""}>
          <b>2</b> Review
        </span>
        <span className={evaluations ? styles.activeStep : ""}>
          <b>3</b> Compare
        </span>
        <span className={downloadState === "done" ? styles.activeStep : ""}>
          <b>4</b> Download
        </span>
      </div>

      <div className={styles.workspace}>
        <div className={styles.formPanel}>
          <div className={styles.sectionHeading}>
            <p>Guided planning chat</p>
            <h2 id="planner-heading">Tell us in your own words</h2>
            <span>
              Share only age, budget, residency, spouse status and coverage
              preferences. Do not include names, contact details, identifiers
              or medical information.
            </span>
          </div>

          <div
            className={styles.transcript}
            ref={transcriptRef}
            role="log"
            aria-live="polite"
            aria-label="Conversation with planning assistant"
          >
            {messages.map((message) => (
              <div
                className={`${styles.message} ${
                  message.role === "user"
                    ? styles.userMessage
                    : styles.assistantMessage
                }`}
                key={message.id}
              >
                <span>{message.role === "user" ? "You" : "ClearCover"}</span>
                <p>{message.content}</p>
              </div>
            ))}
            {chatState === "working" && (
              <div className={`${styles.message} ${styles.assistantMessage}`}>
                <span>ClearCover</span>
                <p className={styles.thinking}>Thinking…</p>
              </div>
            )}
          </div>

          {!profile && showPlanChoices && (
            <section
              className={styles.planTypeChoices}
              aria-labelledby="plan-type-heading"
            >
              <div>
                <h3 id="plan-type-heading">Supported planning summaries</h3>
                <p>
                  Life plans and personal financial advice are outside this
                  prototype. We can offer the closest supported comparison
                  without treating it as equivalent advice.
                </p>
              </div>
              <div>
                {PLAN_TYPE_CHOICES.map((choice) => (
                  <button
                    key={choice.value}
                    type="button"
                    onClick={() => void sendMessage(choice.message)}
                    disabled={chatState === "working"}
                  >
                    <strong>{choice.label}</strong>
                    <span>{choice.description}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {!profile && (
            <form className={styles.composer} onSubmit={handleChatSubmit}>
              <label className={styles.srOnly} htmlFor="chat-answer">
                Reply to the planning assistant
              </label>
              <textarea
                id="chat-answer"
                value={answer}
                onChange={(event) => setAnswer(event.currentTarget.value)}
                onKeyDown={handleComposerKeyDown}
                placeholder="For example: I’m 34 and want hospital and critical illness cover…"
                rows={3}
                maxLength={1_000}
                disabled={chatState === "working"}
              />
              <div>
                <small>Enter to send · Shift+Enter for a new line</small>
                <button
                  className={styles.primaryButton}
                  type="submit"
                  disabled={!answer.trim() || chatState === "working"}
                >
                  Send <span aria-hidden="true">↑</span>
                </button>
              </div>
            </form>
          )}

          {chatError && (
            <div className={styles.chatError} role="alert">
              <p>{chatError}</p>
              <button type="button" onClick={() => setChatState("idle")}>
                Try again
              </button>
            </div>
          )}

          {profile && (
            <form className={styles.reviewCard} onSubmit={handleCompare}>
              <div className={styles.reviewHeading}>
                <div>
                  <span>Review before comparison</span>
                  <h3>Did we understand you correctly?</h3>
                </div>
                <button type="button" onClick={resetConversation}>
                  Start over
                </button>
              </div>

              {Object.keys(errors).length > 0 && (
                <div
                  className={styles.errorSummary}
                  ref={errorSummaryRef}
                  tabIndex={-1}
                  role="alert"
                >
                  <strong>Please check these details.</strong>
                  <ul>
                    {Object.values(errors).map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className={styles.fieldGrid}>
                <label className={styles.field}>
                  <span>Age</span>
                  <input
                    aria-label="Age"
                    type="number"
                    min="18"
                    max="100"
                    value={Number.isNaN(profile.age) ? "" : profile.age}
                    onChange={(event) =>
                      updateProfile("age", event.currentTarget.valueAsNumber)
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span>Annual budget (S$)</span>
                  <input
                    aria-label="Annual insurance budget"
                    type="number"
                    min="1"
                    max="100000"
                    value={profile.annualBudgetSgd}
                    onChange={(event) =>
                      updateProfile(
                        "annualBudgetSgd",
                        event.currentTarget.valueAsNumber,
                      )
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span>Residency status</span>
                  <select
                    value={profile.residencyStatus}
                    onChange={(event) =>
                      updateProfile(
                        "residencyStatus",
                        event.currentTarget.value as ResidencyStatus,
                      )
                    }
                  >
                    {residencyOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Spouse citizenship</span>
                  <select
                    value={profile.spouseCitizenship}
                    onChange={(event) =>
                      updateProfile(
                        "spouseCitizenship",
                        event.currentTarget.value as SpouseCitizenship,
                      )
                    }
                  >
                    {spouseOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>
              </div>
              <fieldset className={styles.coverageFieldset}>
                <legend>Coverage to compare</legend>
                <div className={styles.coverageOptions}>
                  <label>
                    <input
                      type="checkbox"
                      checked={profile.needsGovernmentHospital}
                      onChange={(event) =>
                        updateProfile(
                          "needsGovernmentHospital",
                          event.currentTarget.checked,
                        )
                      }
                    />
                    <span className={styles.customCheck} aria-hidden="true" />
                    <span>
                      <strong>Public hospital plan</strong>
                      <small>Government/public hospital category</small>
                    </span>
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={profile.needsCriticalIllness}
                      onChange={(event) =>
                        updateProfile(
                          "needsCriticalIllness",
                          event.currentTarget.checked,
                        )
                      }
                    />
                    <span className={styles.customCheck} aria-hidden="true" />
                    <span>
                      <strong>Critical illness</strong>
                      <small>Fictional lump-sum coverage category</small>
                    </span>
                  </label>
                </div>
              </fieldset>
              <button className={styles.primaryButton} type="submit">
                Confirm and compare fictional plans
                <span aria-hidden="true">→</span>
              </button>
            </form>
          )}
        </div>

        <div
          className={styles.resultsPanel}
          ref={resultsRef}
          tabIndex={-1}
          aria-live="polite"
        >
          {!evaluations ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyArtwork} aria-hidden="true">
                <span>ASK</span>
                <span>CHECK</span>
                <span>COMPARE</span>
              </div>
              <p>Deterministic comparison</p>
              <h2>The assistant collects. The rules decide.</h2>
              <span>
                The AI only turns your conversation into criteria you can
                review. It never selects or ranks a plan.
              </span>
              <ul>
                <li>Chat answers are sent to the configured AI provider</li>
                <li>No names or medical details needed</li>
                <li>Only fictional plan data is shown</li>
              </ul>
            </div>
          ) : (
            <>
              <div className={styles.resultHeading}>
                <div>
                  <p>Suggested fictional matches</p>
                  <h2>Your fictional plan comparison</h2>
                </div>
                <span className={styles.resultCount}>
                  {evaluations.length} plans checked
                </span>
              </div>
              <div
                className={
                  recommended
                    ? styles.recommendationCallout
                    : styles.noMatchCallout
                }
              >
                <span>
                  {recommended ? "Prototype suggestion" : "No full match"}
                </span>
                <strong>
                  {recommended
                    ? recommended.plan.planName
                    : "No plan meets all selected criteria"}
                </strong>
                <p>
                  {recommended
                    ? recommended.explanation
                    : "Review the explanations below or start a new conversation to change your criteria."}
                </p>
              </div>
              <div className={styles.planList}>
                {evaluations.map((evaluation) => (
                  <PlanCard
                    evaluation={evaluation}
                    key={evaluation.plan.planId}
                  />
                ))}
              </div>
              <div className={styles.downloadPanel}>
                <div>
                  <span>Download</span>
                  <strong>Keep your fictional planning summary</strong>
                  <p>
                    The completed PDF is created in this browser and downloaded
                    directly to your device.
                  </p>
                </div>
                <button
                  className={styles.downloadButton}
                  type="button"
                  onClick={handleDownload}
                  disabled={downloadState === "working"}
                >
                  {downloadState === "working"
                    ? "Preparing PDF..."
                    : "Download planning summary"}
                  <span aria-hidden="true">↓</span>
                </button>
                <p className={styles.downloadStatus} aria-live="polite">
                  {downloadState === "done" &&
                    "Your PDF download has started."}
                  {downloadState === "error" &&
                    "The PDF could not be created. Please try again."}
                </p>
              </div>
              <button
                className={styles.restartButton}
                type="button"
                onClick={resetConversation}
              >
                Start a new conversation
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

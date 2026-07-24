"use client";

import { FormEvent, useRef, useState } from "react";

import { FICTIONAL_PLANS } from "@/data/plans";
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

const DEFAULT_PROFILE: PlanningProfile = {
  age: 34,
  annualBudgetSgd: 3_000,
  residencyStatus: "Foreigner",
  spouseCitizenship: "Singapore citizen",
  needsGovernmentHospital: true,
  needsCriticalIllness: true,
};

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
  const [profile, setProfile] = useState<PlanningProfile>(DEFAULT_PROFILE);
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [evaluations, setEvaluations] = useState<PlanEvaluation[] | null>(null);
  const [downloadState, setDownloadState] = useState<
    "idle" | "working" | "done" | "error"
  >("idle");
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const updateProfile = <Key extends keyof PlanningProfile>(
    key: Key,
    value: PlanningProfile[Key],
  ) => {
    setProfile((current) => ({ ...current, [key]: value }));
    setEvaluations(null);
    setDownloadState("idle");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateProfile(profile);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      requestAnimationFrame(() => errorSummaryRef.current?.focus());
      return;
    }

    const nextEvaluations = evaluatePlans(profile, FICTIONAL_PLANS);
    setEvaluations(nextEvaluations);
    requestAnimationFrame(() => resultsRef.current?.focus());
  };

  const handleDownload = async () => {
    if (!evaluations) return;
    setDownloadState("working");

    try {
      const { downloadPlanningSummary } = await import("@/lib/download");
      await downloadPlanningSummary(profile, evaluations);
      setDownloadState("done");
    } catch {
      setDownloadState("error");
    }
  };

  const recommended = evaluations?.find(
    (evaluation) => evaluation.status === "Recommended",
  );

  return (
    <section className={styles.planner} aria-labelledby="planner-heading">
      <div className={styles.stepRail} aria-label="Planning steps">
        <span className={styles.activeStep}>
          <b>1</b> Your details
        </span>
        <span className={evaluations ? styles.activeStep : ""}>
          <b>2</b> Compare plans
        </span>
        <span className={downloadState === "done" ? styles.activeStep : ""}>
          <b>3</b> Download
        </span>
      </div>

      <div className={styles.workspace}>
        <div className={styles.formPanel}>
          <div className={styles.sectionHeading}>
            <p>Step 01</p>
            <h2 id="planner-heading">Tell us what matters</h2>
            <span>
              Start with the fictional KAN-5 example or adjust the planning
              details. Nothing is sent or saved.
            </span>
          </div>

          {Object.keys(errors).length > 0 && (
            <div
              className={styles.errorSummary}
              ref={errorSummaryRef}
              tabIndex={-1}
              role="alert"
            >
              <strong>Please check your details.</strong>
              <ul>
                {Object.values(errors).map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className={styles.fieldGrid}>
              <div className={styles.field}>
                <label htmlFor="age">Age</label>
                <div className={styles.inputShell}>
                  <input
                    id="age"
                    type="number"
                    min="18"
                    max="100"
                    step="1"
                    value={Number.isNaN(profile.age) ? "" : profile.age}
                    onChange={(event) =>
                      updateProfile("age", event.currentTarget.valueAsNumber)
                    }
                    aria-invalid={Boolean(errors.age)}
                    aria-describedby={errors.age ? "age-error" : "age-hint"}
                  />
                  <span>years</span>
                </div>
                {errors.age ? (
                  <p className={styles.fieldError} id="age-error">
                    {errors.age}
                  </p>
                ) : (
                  <p className={styles.hint} id="age-hint">
                    Adults aged 18 to 100
                  </p>
                )}
              </div>

              <div className={styles.field}>
                <label htmlFor="budget">Annual insurance budget</label>
                <div className={styles.inputShell}>
                  <span>S$</span>
                  <input
                    id="budget"
                    type="number"
                    min="1"
                    max="100000"
                    step="100"
                    value={
                      Number.isNaN(profile.annualBudgetSgd)
                        ? ""
                        : profile.annualBudgetSgd
                    }
                    onChange={(event) =>
                      updateProfile(
                        "annualBudgetSgd",
                        event.currentTarget.valueAsNumber,
                      )
                    }
                    aria-invalid={Boolean(errors.annualBudgetSgd)}
                    aria-describedby={
                      errors.annualBudgetSgd ? "budget-error" : "budget-hint"
                    }
                  />
                  <span>/ year</span>
                </div>
                {errors.annualBudgetSgd ? (
                  <p className={styles.fieldError} id="budget-error">
                    {errors.annualBudgetSgd}
                  </p>
                ) : (
                  <p className={styles.hint} id="budget-hint">
                    Comparison uses annual fictional premiums
                  </p>
                )}
              </div>

              <div className={styles.field}>
                <label htmlFor="residency">Residency status</label>
                <select
                  id="residency"
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
                <p className={styles.hint}>Shown in the summary only</p>
              </div>

              <div className={styles.field}>
                <label htmlFor="spouse-citizenship">
                  Spouse citizenship
                </label>
                <select
                  id="spouse-citizenship"
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
                <p className={styles.hint}>Not used as an eligibility rule</p>
              </div>
            </div>

            <fieldset
              className={styles.coverageFieldset}
              aria-describedby={
                errors.coverageNeeds ? "coverage-error" : "coverage-hint"
              }
            >
              <legend>What would you like to compare?</legend>
              <p className={styles.hint} id="coverage-hint">
                Select one or both fictional coverage categories.
              </p>
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
              {errors.coverageNeeds && (
                <p className={styles.fieldError} id="coverage-error">
                  {errors.coverageNeeds}
                </p>
              )}
            </fieldset>

            <div className={styles.formActions}>
              <button className={styles.primaryButton} type="submit">
                Compare fictional plans
                <span aria-hidden="true">→</span>
              </button>
              <button
                className={styles.textButton}
                type="button"
                onClick={() => {
                  setProfile(DEFAULT_PROFILE);
                  setErrors({});
                  setEvaluations(null);
                  setDownloadState("idle");
                }}
              >
                Reset example
              </button>
            </div>
          </form>
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
                <span>01</span>
                <span>02</span>
                <span>03</span>
              </div>
              <p>Step 02</p>
              <h2>Your comparison will appear here</h2>
              <span>
                Three fictional plans will be checked against age, selected
                coverage and annual budget. Every result includes an
                explanation.
              </span>
              <ul>
                <li>No personal data is uploaded</li>
                <li>No medical questions</li>
                <li>No real insurer or product data</li>
              </ul>
            </div>
          ) : (
            <>
              <div className={styles.resultHeading}>
                <div>
                  <p>Step 02</p>
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
                  {recommended ? "Prototype recommendation" : "No full match"}
                </span>
                <strong>
                  {recommended
                    ? recommended.plan.planName
                    : "No plan meets all selected criteria"}
                </strong>
                <p>
                  {recommended
                    ? recommended.explanation
                    : "Review the three explanations below or adjust the age, coverage or budget inputs."}
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
                  <span>Step 03</span>
                  <strong>Keep your fictional planning summary</strong>
                  <p>
                    The PDF is created in this browser and downloaded directly
                    to your device.
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
            </>
          )}
        </div>
      </div>
    </section>
  );
}

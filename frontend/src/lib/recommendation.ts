import { formatSgd } from "@/lib/format";
import type {
  InsurancePlan,
  PlanEvaluation,
  PlanningProfile,
  RecommendationStatus,
} from "@/types/planning";

type MatchResult = Omit<PlanEvaluation, "status" | "explanation">;

function matchPlan(
  profile: PlanningProfile,
  plan: InsurancePlan,
): MatchResult {
  const ageMatch = profile.age >= plan.minAge && profile.age <= plan.maxAge;
  const coverageMatch =
    (!profile.needsGovernmentHospital ||
      plan.includesGovernmentHospital) &&
    (!profile.needsCriticalIllness || plan.includesCriticalIllness);
  const budgetMatch = plan.annualPremiumSgd <= profile.annualBudgetSgd;

  return {
    plan,
    ageMatch,
    coverageMatch,
    budgetMatch,
    criteriaMetCount: [ageMatch, coverageMatch, budgetMatch].filter(Boolean)
      .length,
  };
}

function candidateSort(
  profile: PlanningProfile,
  left: MatchResult,
  right: MatchResult,
): number {
  if (profile.needsCriticalIllness) {
    const coverageDifference =
      right.plan.criticalIllnessCoverageSgd -
      left.plan.criticalIllnessCoverageSgd;
    if (coverageDifference !== 0) return coverageDifference;
  }

  const premiumDifference =
    left.plan.annualPremiumSgd - right.plan.annualPremiumSgd;
  if (premiumDifference !== 0) return premiumDifference;
  return left.plan.planId.localeCompare(right.plan.planId);
}

function explainEvaluation(
  profile: PlanningProfile,
  result: MatchResult,
  status: RecommendationStatus,
): string {
  const reasons: string[] = [];

  reasons.push(
    result.ageMatch
      ? `Age ${profile.age} is within the fictional ${result.plan.minAge}-${result.plan.maxAge} range.`
      : `Age ${profile.age} is outside the fictional ${result.plan.minAge}-${result.plan.maxAge} range.`,
  );

  reasons.push(
    result.coverageMatch
      ? "The plan includes every selected coverage category."
      : "The plan does not include every selected coverage category.",
  );

  const premium = formatSgd(result.plan.annualPremiumSgd);
  const budget = formatSgd(profile.annualBudgetSgd);
  reasons.push(
    result.budgetMatch
      ? `${premium} per year is within the ${budget} budget.`
      : `${premium} per year exceeds the ${budget} budget by ${formatSgd(
          result.plan.annualPremiumSgd - profile.annualBudgetSgd,
        )}.`,
  );

  if (status === "Recommended") {
    reasons.push(
      profile.needsCriticalIllness
        ? "Among complete matches, it has the greatest fictional critical-illness coverage."
        : "Among complete matches, it has the lowest annual premium.",
    );
  } else if (status === "Alternative") {
    reasons.push("It is a complete match, but another candidate ranks higher.");
  }

  return reasons.join(" ");
}

export function evaluatePlans(
  profile: PlanningProfile,
  plans: InsurancePlan[],
): PlanEvaluation[] {
  const matches = plans.map((plan) => matchPlan(profile, plan));
  const candidates = matches
    .filter(
      (result) =>
        result.ageMatch && result.coverageMatch && result.budgetMatch,
    )
    .sort((left, right) => candidateSort(profile, left, right));
  const recommendedPlanId = candidates[0]?.plan.planId;
  const candidateIds = new Set(candidates.map((result) => result.plan.planId));

  return matches.map((result) => {
    let status: RecommendationStatus = "Not recommended";
    if (result.plan.planId === recommendedPlanId) {
      status = "Recommended";
    } else if (candidateIds.has(result.plan.planId)) {
      status = "Alternative";
    }

    return {
      ...result,
      status,
      explanation: explainEvaluation(profile, result, status),
    };
  });
}

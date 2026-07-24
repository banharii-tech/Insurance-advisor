export type ResidencyStatus =
  | "Singapore citizen"
  | "Permanent resident"
  | "Foreigner"
  | "Prefer not to say";

export type SpouseCitizenship =
  | "Singapore citizen"
  | "Permanent resident"
  | "Other"
  | "Not applicable"
  | "Prefer not to say";

export interface PlanningProfile {
  age: number;
  annualBudgetSgd: number;
  residencyStatus: ResidencyStatus;
  spouseCitizenship: SpouseCitizenship;
  needsGovernmentHospital: boolean;
  needsCriticalIllness: boolean;
}

export interface InsurancePlan {
  planId: string;
  providerName: string;
  planName: string;
  minAge: number;
  maxAge: number;
  includesGovernmentHospital: boolean;
  hospitalCoverageLevel: string;
  includesCriticalIllness: boolean;
  criticalIllnessCoverageSgd: number;
  annualPremiumSgd: number;
  isFictional: true;
}

export type RecommendationStatus =
  | "Recommended"
  | "Alternative"
  | "Not recommended";

export interface PlanEvaluation {
  plan: InsurancePlan;
  ageMatch: boolean;
  coverageMatch: boolean;
  budgetMatch: boolean;
  criteriaMetCount: number;
  status: RecommendationStatus;
  explanation: string;
}

export type ProfileErrors = Partial<
  Record<"age" | "annualBudgetSgd" | "coverageNeeds", string>
>;

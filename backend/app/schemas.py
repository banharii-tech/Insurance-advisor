from __future__ import annotations

from typing import Annotated, Literal, Optional

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)


ResidencyStatus = Literal[
    "Singapore citizen",
    "Permanent resident",
    "Foreigner",
    "Prefer not to say",
]
SpouseCitizenship = Literal[
    "Singapore citizen",
    "Permanent resident",
    "Other",
    "Not applicable",
    "Prefer not to say",
]
RequestIntent = Literal[
    "hospitalisation",
    "critical_illness",
    "combined",
    "unsupported",
    "undetermined",
]
UnsupportedTopic = Literal["life_plan", "financial_advice", "other"]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ChatMessage(StrictModel):
    role: Literal["user", "assistant"]
    content: Annotated[str, Field(min_length=1, max_length=1_000)]


class HospitalisationCriteria(StrictModel):
    required: Optional[bool] = None
    government_hospital: Optional[bool] = None


class CriticalIllnessCriteria(StrictModel):
    required: Optional[bool] = None


class ExtractedCriteria(StrictModel):
    age: Annotated[Optional[int], Field(default=None, ge=18, le=100)]
    annual_budget_sgd: Annotated[
        Optional[float], Field(default=None, gt=0, le=100_000)
    ]
    residency_status: Optional[ResidencyStatus] = None
    spouse_citizenship: Optional[SpouseCitizenship] = None
    hospitalisation: HospitalisationCriteria = Field(
        default_factory=HospitalisationCriteria
    )
    critical_illness: CriticalIllnessCriteria = Field(
        default_factory=CriticalIllnessCriteria
    )


MissingField = Literal[
    "age",
    "annual_budget_sgd",
    "residency_status",
    "spouse_citizenship",
    "coverage_needs",
    "supported_plan_type",
]


class ChatExtraction(StrictModel):
    assistant_message: Annotated[str, Field(min_length=1, max_length=800)]
    request_intent: RequestIntent
    unsupported_topic: Optional[UnsupportedTopic] = None
    criteria: ExtractedCriteria
    missing_fields: list[MissingField]
    needs_confirmation: bool
    ready_for_review: bool

    @model_validator(mode="after")
    def validate_review_state(self) -> "ChatExtraction":
        criteria = self.criteria
        if self.request_intent in {
            "hospitalisation",
            "critical_illness",
            "combined",
        }:
            self.unsupported_topic = None
            criteria.hospitalisation.required = self.request_intent in {
                "hospitalisation",
                "combined",
            }
            criteria.hospitalisation.government_hospital = (
                criteria.hospitalisation.required
            )
            criteria.critical_illness.required = self.request_intent in {
                "critical_illness",
                "combined",
            }
        elif (
            self.request_intent == "unsupported"
            and self.unsupported_topic is None
        ):
            self.unsupported_topic = "other"

        coverage_complete = (
            self.request_intent
            in {"hospitalisation", "critical_illness", "combined"}
            and criteria.hospitalisation.required is not None
            and criteria.critical_illness.required is not None
            and (
                criteria.hospitalisation.required
                or criteria.critical_illness.required
            )
        )
        actual_missing: list[MissingField] = []
        if criteria.age is None:
            actual_missing.append("age")
        if criteria.annual_budget_sgd is None:
            actual_missing.append("annual_budget_sgd")
        if criteria.residency_status is None:
            actual_missing.append("residency_status")
        if criteria.spouse_citizenship is None:
            actual_missing.append("spouse_citizenship")
        if self.request_intent in {"unsupported", "undetermined"}:
            actual_missing.append("supported_plan_type")
        elif not coverage_complete:
            actual_missing.append("coverage_needs")

        self.missing_fields = actual_missing
        self.ready_for_review = not actual_missing
        self.needs_confirmation = not actual_missing
        return self


class ChatRequest(StrictModel):
    messages: Annotated[list[ChatMessage], Field(min_length=1, max_length=20)]


class ProfileResponse(StrictModel):
    age: int
    annualBudgetSgd: float
    residencyStatus: ResidencyStatus
    spouseCitizenship: SpouseCitizenship
    needsGovernmentHospital: bool
    needsCriticalIllness: bool


class UserResponse(StrictModel):
    userId: str
    displayName: str
    email: str


class AuthSessionResponse(StrictModel):
    sessionId: str
    createdAt: str
    user: UserResponse


class SignUpRequest(StrictModel):
    displayName: Annotated[str, Field(min_length=2, max_length=80)]
    email: Annotated[
        str,
        Field(
            min_length=5,
            max_length=254,
            pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$",
        ),
    ]
    password: Annotated[str, Field(min_length=8, max_length=128)]

    @field_validator("displayName", "email", mode="before")
    @classmethod
    def strip_account_fields(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value


class SignInRequest(StrictModel):
    email: Annotated[
        str,
        Field(
            min_length=5,
            max_length=254,
            pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$",
        ),
    ]
    password: Annotated[str, Field(min_length=8, max_length=128)]

    @field_validator("email", mode="before")
    @classmethod
    def strip_email(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value


class PlanSnapshot(StrictModel):
    planId: str
    providerName: str
    planName: str
    minAge: int
    maxAge: int
    includesGovernmentHospital: bool
    hospitalCoverageLevel: str
    includesCriticalIllness: bool
    criticalIllnessCoverageSgd: float
    annualPremiumSgd: float
    isFictional: Literal[True]


class PlanEvaluationSnapshot(StrictModel):
    plan: PlanSnapshot
    ageMatch: bool
    coverageMatch: bool
    budgetMatch: bool
    criteriaMetCount: Annotated[int, Field(ge=0, le=3)]
    status: Literal["Recommended", "Alternative", "Not recommended"]
    explanation: str


class SuggestionCreate(StrictModel):
    title: Annotated[str, Field(min_length=1, max_length=120)]
    summaryType: Literal["hospitalisation", "critical_illness", "combined"]
    profile: ProfileResponse
    evaluations: Annotated[
        list[PlanEvaluationSnapshot], Field(min_length=1, max_length=20)
    ]
    recommendedPlanName: Optional[str] = None


class SuggestionResponse(SuggestionCreate):
    suggestionId: str
    createdAt: str


class ChatResponse(StrictModel):
    assistantMessage: str
    profile: Optional[ProfileResponse]
    missingFields: list[MissingField]
    readyForReview: bool
    requestIntent: RequestIntent
    needsSupportedPlanChoice: bool
    supportedPlanTypes: list[
        Literal["hospitalisation", "critical_illness", "combined"]
    ]

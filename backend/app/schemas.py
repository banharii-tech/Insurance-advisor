from __future__ import annotations

from typing import Annotated, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator


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
]


class ChatExtraction(StrictModel):
    assistant_message: Annotated[str, Field(min_length=1, max_length=800)]
    criteria: ExtractedCriteria
    missing_fields: list[MissingField]
    needs_confirmation: bool
    ready_for_review: bool

    @model_validator(mode="after")
    def validate_review_state(self) -> "ChatExtraction":
        criteria = self.criteria
        coverage_complete = (
            criteria.hospitalisation.required is not None
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
        if not coverage_complete:
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


class ChatResponse(StrictModel):
    assistantMessage: str
    profile: Optional[ProfileResponse]
    missingFields: list[MissingField]
    readyForReview: bool


class DemoSessionResponse(StrictModel):
    sessionId: str
    createdAt: str

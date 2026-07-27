from __future__ import annotations

import logging
import re

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .ai import collect_criteria
from .schemas import ChatRequest, ChatResponse, ProfileResponse


logger = logging.getLogger(__name__)
app = FastAPI(title="ClearCover information collection API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["POST"],
    allow_headers=["Content-Type"],
)

SENSITIVE_PATTERNS = (
    re.compile(r"\b[STFG]\d{7}[A-Z]\b", re.IGNORECASE),
    re.compile(r"\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b"),
    re.compile(r"(?:\+?65[\s-]?)?[689]\d{3}[\s-]?\d{4}\b"),
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    latest_answer = request.messages[-1].content
    if any(pattern.search(latest_answer) for pattern in SENSITIVE_PATTERNS):
        raise HTTPException(
            status_code=422,
            detail=(
                "Please remove contact details or identification numbers. "
                "They are not needed for this fictional comparison."
            ),
        )

    try:
        extraction = await collect_criteria(request.messages)
    except Exception:
        logger.exception("AI criteria extraction failed (user answers omitted)")
        raise HTTPException(
            status_code=503,
            detail="The planning assistant is temporarily unavailable. Please try again.",
        ) from None

    criteria = extraction.criteria
    profile = None
    if extraction.ready_for_review:
        profile = ProfileResponse(
            age=criteria.age,
            annualBudgetSgd=criteria.annual_budget_sgd,
            residencyStatus=criteria.residency_status,
            spouseCitizenship=criteria.spouse_citizenship,
            needsGovernmentHospital=bool(
                criteria.hospitalisation.required
                and criteria.hospitalisation.government_hospital
            ),
            needsCriticalIllness=bool(criteria.critical_illness.required),
        )

    return ChatResponse(
        assistantMessage=extraction.assistant_message,
        profile=profile,
        missingFields=extraction.missing_fields,
        readyForReview=extraction.ready_for_review,
    )

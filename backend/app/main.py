from __future__ import annotations

from contextlib import asynccontextmanager
import logging
import os
import re

from fastapi import FastAPI, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware

from .ai import collect_criteria
from .database import TemporaryDatabase
from .schemas import (
    ChatRequest,
    ChatResponse,
    DemoSessionResponse,
    ProfileResponse,
)


logger = logging.getLogger(__name__)
database = TemporaryDatabase()
SUPPORTED_PLAN_TYPES = ["hospitalisation", "critical_illness", "combined"]


@asynccontextmanager
async def lifespan(_: FastAPI):
    database.initialize()
    yield


app = FastAPI(
    title="ClearCover V1 foundation API",
    version="0.2.0",
    lifespan=lifespan,
)
frontend_origins = [
    origin.strip()
    for origin in os.getenv(
        "FRONTEND_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins,
    allow_methods=["DELETE", "POST"],
    allow_headers=["Content-Type"],
)

SENSITIVE_PATTERNS = (
    re.compile(r"\b[STFG]\d{7}[A-Z]\b", re.IGNORECASE),
    re.compile(r"\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b"),
    re.compile(r"(?:\+?65[\s-]?)?[689]\d{3}[\s-]?\d{4}\b"),
)


@app.get("/health")
async def health() -> dict[str, str]:
    if not database.is_ready():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Temporary database is unavailable.",
        )
    return {"status": "ok", "database": "ok"}


@app.post(
    "/api/demo-sessions",
    response_model=DemoSessionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_demo_session() -> DemoSessionResponse:
    session = database.create_demo_session()
    return DemoSessionResponse(
        sessionId=session.session_id,
        createdAt=session.created_at,
    )


@app.delete(
    "/api/demo-sessions/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_demo_session(session_id: str) -> Response:
    database.delete_demo_session(session_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


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
        requestIntent=extraction.request_intent,
        needsSupportedPlanChoice=(
            "supported_plan_type" in extraction.missing_fields
        ),
        supportedPlanTypes=SUPPORTED_PLAN_TYPES,
    )

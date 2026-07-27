from __future__ import annotations

from contextlib import asynccontextmanager
import logging
import os
import re
from typing import Annotated, Optional

from fastapi import Depends, FastAPI, Header, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware

from .ai import collect_criteria
from .database import TemporaryDatabase, UserSession
from .schemas import (
    AuthSessionResponse,
    ChatRequest,
    ChatResponse,
    ProfileResponse,
    SignInRequest,
    SignUpRequest,
    SuggestionCreate,
    SuggestionResponse,
    UserResponse,
)


logger = logging.getLogger(__name__)
database = TemporaryDatabase()
SUPPORTED_PLAN_TYPES = ["hospitalisation", "critical_illness", "combined"]


@asynccontextmanager
async def lifespan(_: FastAPI):
    database.initialize(reset=True)
    yield


app = FastAPI(
    title="ClearCover temporary workspace API",
    version="0.3.0",
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
    allow_methods=["DELETE", "GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
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


def _session_response(session: UserSession) -> AuthSessionResponse:
    return AuthSessionResponse(
        sessionId=session.session_id,
        createdAt=session.created_at,
        user=UserResponse(
            userId=session.user_id,
            displayName=session.display_name,
            email=session.email,
        ),
    )


def require_session(
    authorization: Annotated[Optional[str], Header()] = None,
) -> UserSession:
    scheme, _, token = (authorization or "").partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sign in to access your saved drafts.",
        )
    session = database.get_session(token)
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your temporary session has expired. Please sign in again.",
        )
    return session


@app.post(
    "/api/auth/sign-up",
    response_model=AuthSessionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def sign_up(request: SignUpRequest) -> AuthSessionResponse:
    try:
        session = database.register_user(
            request.displayName,
            request.email,
            request.password,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        ) from error
    return _session_response(session)


@app.post("/api/auth/sign-in", response_model=AuthSessionResponse)
async def sign_in(request: SignInRequest) -> AuthSessionResponse:
    session = database.sign_in(request.email, request.password)
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="The email or password is incorrect.",
        )
    return _session_response(session)


@app.delete(
    "/api/auth/sessions/current", status_code=status.HTTP_204_NO_CONTENT
)
async def sign_out(session: UserSession = Depends(require_session)) -> Response:
    database.delete_session(session.session_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.get("/api/suggestions", response_model=list[SuggestionResponse])
async def list_suggestions(
    session: UserSession = Depends(require_session),
) -> list[SuggestionResponse]:
    return [
        SuggestionResponse.model_validate(
            {
                **record.payload,
                "suggestionId": record.suggestion_id,
                "createdAt": record.created_at,
            }
        )
        for record in database.list_suggestions(session.user_id)
    ]


@app.post(
    "/api/suggestions",
    response_model=SuggestionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def save_suggestion(
    request: SuggestionCreate,
    session: UserSession = Depends(require_session),
) -> SuggestionResponse:
    record = database.save_suggestion(
        session.user_id,
        request.title,
        request.summaryType,
        request.model_dump(mode="json"),
    )
    return SuggestionResponse.model_validate(
        {
            **record.payload,
            "suggestionId": record.suggestion_id,
            "createdAt": record.created_at,
        }
    )


@app.post("/api/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    _: UserSession = Depends(require_session),
) -> ChatResponse:
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

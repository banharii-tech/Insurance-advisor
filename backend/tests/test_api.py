from __future__ import annotations

import unittest
import tempfile
from pathlib import Path
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

import app.main as main_module
from app.ai import collect_criteria
from app.database import TemporaryDatabase, UserSession
from app.main import app, require_session
from app.schemas import ChatExtraction, ChatMessage


READY_EXTRACTION = ChatExtraction.model_validate(
    {
        "assistant_message": "Please review these details.",
        "request_intent": "combined",
        "unsupported_topic": None,
        "criteria": {
            "age": 34,
            "annual_budget_sgd": 3000,
            "residency_status": "Foreigner",
            "spouse_citizenship": "Singapore citizen",
            "hospitalisation": {
                "required": True,
                "government_hospital": True,
            },
            "critical_illness": {"required": True},
        },
        "missing_fields": [],
        "needs_confirmation": True,
        "ready_for_review": True,
    }
)

UNSUPPORTED_EXTRACTION = ChatExtraction.model_validate(
    {
        "assistant_message": (
            "I cannot create a life plan or provide financial advice. "
            "I can guide a public hospital or critical illness comparison."
        ),
        "request_intent": "unsupported",
        "unsupported_topic": "life_plan",
        "criteria": {},
        "missing_fields": [],
        "needs_confirmation": False,
        "ready_for_review": False,
    }
)

SUGGESTION_DRAFT = {
    "title": "Combined coverage planning draft",
    "summaryType": "combined",
    "profile": {
        "age": 34,
        "annualBudgetSgd": 3000,
        "residencyStatus": "Foreigner",
        "spouseCitizenship": "Singapore citizen",
        "needsGovernmentHospital": True,
        "needsCriticalIllness": True,
    },
    "evaluations": [
        {
            "plan": {
                "planId": "PLAN-001",
                "providerName": "Example Assurance",
                "planName": "Example Balanced Bundle",
                "minAge": 18,
                "maxAge": 65,
                "includesGovernmentHospital": True,
                "hospitalCoverageLevel": "Public hospital",
                "includesCriticalIllness": True,
                "criticalIllnessCoverageSgd": 100000,
                "annualPremiumSgd": 2400,
                "isFictional": True,
            },
            "ageMatch": True,
            "coverageMatch": True,
            "budgetMatch": True,
            "criteriaMetCount": 3,
            "status": "Recommended",
            "explanation": "This fictional plan passes all selected checks.",
        }
    ],
    "recommendedPlanName": "Example Balanced Bundle",
}


class ChatApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)
        app.dependency_overrides[require_session] = lambda: UserSession(
            session_id="test-session",
            user_id="test-user",
            display_name="Test User",
            email="test@example.test",
            created_at="2026-07-27T00:00:00+00:00",
        )

    def tearDown(self) -> None:
        app.dependency_overrides.clear()

    @patch("app.main.collect_criteria", new_callable=AsyncMock)
    def test_returns_reviewable_profile(self, mock_collect: AsyncMock) -> None:
        mock_collect.return_value = READY_EXTRACTION
        response = self.client.post(
            "/api/chat",
            json={"messages": [{"role": "user", "content": "Fictional details"}]},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["profile"]["age"], 34)
        self.assertTrue(response.json()["readyForReview"])
        self.assertEqual(response.json()["requestIntent"], "combined")
        self.assertFalse(response.json()["needsSupportedPlanChoice"])

    @patch("app.main.collect_criteria", new_callable=AsyncMock)
    def test_guides_unsupported_request_to_supported_types(
        self, mock_collect: AsyncMock
    ) -> None:
        mock_collect.return_value = UNSUPPORTED_EXTRACTION
        response = self.client.post(
            "/api/chat",
            json={"messages": [{"role": "user", "content": "I want a life plan"}]},
        )

        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.json()["profile"])
        self.assertEqual(response.json()["requestIntent"], "unsupported")
        self.assertTrue(response.json()["needsSupportedPlanChoice"])
        self.assertEqual(
            response.json()["supportedPlanTypes"],
            ["hospitalisation", "critical_illness", "combined"],
        )

    def test_rejects_contact_details_before_model_call(self) -> None:
        response = self.client.post(
            "/api/chat",
            json={
                "messages": [
                    {"role": "user", "content": "Email me at user@example.com"}
                ]
            },
        )

        self.assertEqual(response.status_code, 422)
        self.assertIn("remove contact details", response.json()["detail"])

    @patch("app.main.collect_criteria", new_callable=AsyncMock)
    def test_sanitizes_provider_failure(self, mock_collect: AsyncMock) -> None:
        mock_collect.side_effect = RuntimeError("provider response included details")
        response = self.client.post(
            "/api/chat",
            json={"messages": [{"role": "user", "content": "Fictional details"}]},
        )

        self.assertEqual(response.status_code, 503)
        self.assertNotIn("provider response", response.text)


class AccountAndSuggestionApiTests(unittest.TestCase):
    def test_account_session_and_saved_draft_lifecycle(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            temporary_database = TemporaryDatabase(
                Path(directory) / "clearcover.sqlite3"
            )
            with patch.object(main_module, "database", temporary_database):
                with TestClient(app) as client:
                    health = client.get("/health")
                    created = client.post(
                        "/api/auth/sign-up",
                        json={
                            "displayName": "Alice Tan",
                            "email": "alice@example.test",
                            "password": "strong-pass-1",
                        },
                    )

                    self.assertEqual(health.status_code, 200)
                    self.assertEqual(health.json()["database"], "ok")
                    self.assertEqual(created.status_code, 201)
                    self.assertEqual(
                        created.json()["user"]["displayName"], "Alice Tan"
                    )
                    token = created.json()["sessionId"]
                    headers = {"Authorization": f"Bearer {token}"}

                    saved = client.post(
                        "/api/suggestions",
                        json=SUGGESTION_DRAFT,
                        headers=headers,
                    )
                    self.assertEqual(saved.status_code, 201)
                    self.assertEqual(saved.json()["summaryType"], "combined")

                    history = client.get(
                        "/api/suggestions", headers=headers
                    )
                    self.assertEqual(history.status_code, 200)
                    self.assertEqual(len(history.json()), 1)

                    signed_out = client.delete(
                        "/api/auth/sessions/current", headers=headers
                    )
                    self.assertEqual(signed_out.status_code, 204)
                    self.assertEqual(
                        client.get(
                            "/api/suggestions", headers=headers
                        ).status_code,
                        401,
                    )

    def test_returning_users_keep_separate_draft_histories(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            temporary_database = TemporaryDatabase(
                Path(directory) / "clearcover.sqlite3"
            )
            with patch.object(main_module, "database", temporary_database):
                with TestClient(app) as client:
                    alice = client.post(
                        "/api/auth/sign-up",
                        json={
                            "displayName": "Alice Tan",
                            "email": "alice@example.test",
                            "password": "strong-pass-1",
                        },
                    ).json()
                    bob = client.post(
                        "/api/auth/sign-up",
                        json={
                            "displayName": "Bob Lim",
                            "email": "bob@example.test",
                            "password": "strong-pass-2",
                        },
                    ).json()
                    alice_headers = {
                        "Authorization": f"Bearer {alice['sessionId']}"
                    }
                    bob_headers = {
                        "Authorization": f"Bearer {bob['sessionId']}"
                    }
                    client.post(
                        "/api/suggestions",
                        json=SUGGESTION_DRAFT,
                        headers=alice_headers,
                    )

                    self.assertEqual(
                        client.get(
                            "/api/suggestions", headers=bob_headers
                        ).json(),
                        [],
                    )

                    returning = client.post(
                        "/api/auth/sign-in",
                        json={
                            "email": "alice@example.test",
                            "password": "strong-pass-1",
                        },
                    )
                    self.assertEqual(returning.status_code, 200)
                    returning_headers = {
                        "Authorization": (
                            f"Bearer {returning.json()['sessionId']}"
                        )
                    }
                    self.assertEqual(
                        len(
                            client.get(
                                "/api/suggestions",
                                headers=returning_headers,
                            ).json()
                        ),
                        1,
                    )

    def test_rejects_duplicate_account_and_invalid_credentials(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            temporary_database = TemporaryDatabase(
                Path(directory) / "clearcover.sqlite3"
            )
            with patch.object(main_module, "database", temporary_database):
                with TestClient(app) as client:
                    account = {
                        "displayName": "Alice Tan",
                        "email": "alice@example.test",
                        "password": "strong-pass-1",
                    }
                    self.assertEqual(
                        client.post(
                            "/api/auth/sign-up", json=account
                        ).status_code,
                        201,
                    )
                    self.assertEqual(
                        client.post(
                            "/api/auth/sign-up", json=account
                        ).status_code,
                        409,
                    )
                    self.assertEqual(
                        client.post(
                            "/api/auth/sign-in",
                            json={
                                "email": account["email"],
                                "password": "wrong-password",
                            },
                        ).status_code,
                        401,
                    )
                    self.assertEqual(
                        client.get("/api/suggestions").status_code,
                        401,
                    )
                    self.assertEqual(
                        client.post(
                            "/api/chat",
                            json={
                                "messages": [
                                    {
                                        "role": "user",
                                        "content": "Fictional details",
                                    }
                                ]
                            },
                        ).status_code,
                        401,
                    )


class ProviderRoutingTests(unittest.IsolatedAsyncioTestCase):
    @patch("app.ai.acompletion", new_callable=AsyncMock)
    async def test_pins_openrouter_to_cerebras(self, mock_completion: AsyncMock) -> None:
        mock_completion.return_value.choices = [
            type(
                "Choice",
                (),
                {
                    "message": type(
                        "Message",
                        (),
                        {"content": READY_EXTRACTION.model_dump_json()},
                    )()
                },
            )()
        ]

        await collect_criteria(
            [ChatMessage(role="user", content="Use fictional details")]
        )

        kwargs = mock_completion.await_args.kwargs
        self.assertEqual(kwargs["model"], "openrouter/openai/gpt-oss-120b")
        self.assertEqual(kwargs["extra_body"]["provider"]["only"], ["cerebras"])
        self.assertFalse(kwargs["extra_body"]["provider"]["allow_fallbacks"])
        self.assertEqual(
            kwargs["extra_body"]["provider"]["data_collection"], "deny"
        )
        self.assertTrue(kwargs["extra_body"]["provider"]["zdr"])
        self.assertEqual(kwargs["timeout"], 30)


if __name__ == "__main__":
    unittest.main()

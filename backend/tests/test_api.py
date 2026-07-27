from __future__ import annotations

import unittest
import tempfile
from pathlib import Path
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

import app.main as main_module
from app.ai import collect_criteria
from app.database import TemporaryDatabase
from app.main import app
from app.schemas import ChatExtraction, ChatMessage


READY_EXTRACTION = ChatExtraction.model_validate(
    {
        "assistant_message": "Please review these details.",
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


class ChatApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)

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


class DemoSessionApiTests(unittest.TestCase):
    def test_session_lifecycle_and_database_health(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            temporary_database = TemporaryDatabase(
                Path(directory) / "clearcover.sqlite3"
            )
            with patch.object(main_module, "database", temporary_database):
                with TestClient(app) as client:
                    health = client.get("/health")
                    created = client.post("/api/demo-sessions")

                    self.assertEqual(health.status_code, 200)
                    self.assertEqual(health.json()["database"], "ok")
                    self.assertEqual(created.status_code, 201)
                    self.assertEqual(temporary_database.count_demo_sessions(), 1)

                    deleted = client.delete(
                        f"/api/demo-sessions/{created.json()['sessionId']}"
                    )
                    self.assertEqual(deleted.status_code, 204)
                    self.assertEqual(temporary_database.count_demo_sessions(), 0)


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

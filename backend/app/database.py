from __future__ import annotations

import base64
from dataclasses import dataclass
from datetime import datetime, timezone
import hashlib
import hmac
import json
import os
from pathlib import Path
import secrets
import sqlite3
from typing import Any
from uuid import uuid4


@dataclass(frozen=True)
class UserSession:
    session_id: str
    user_id: str
    display_name: str
    email: str
    created_at: str


@dataclass(frozen=True)
class SuggestionRecord:
    suggestion_id: str
    title: str
    summary_type: str
    payload: dict[str, Any]
    created_at: str


class TemporaryDatabase:
    """Disposable SQLite store for local accounts, sessions, and drafts."""

    def __init__(self, path: Path | None = None) -> None:
        configured_path = os.getenv(
            "DATABASE_PATH", "/tmp/clearcover-v1.sqlite3"
        )
        self.path = path or Path(configured_path)

    def initialize(self, *, reset: bool = False) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self._connect() as connection:
            if reset:
                connection.executescript(
                    """
                    DROP TABLE IF EXISTS suggestions;
                    DROP TABLE IF EXISTS user_sessions;
                    DROP TABLE IF EXISTS users;
                    DROP TABLE IF EXISTS demo_sessions;
                    """
                )
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS users (
                    user_id TEXT PRIMARY KEY,
                    display_name TEXT NOT NULL,
                    email TEXT NOT NULL UNIQUE,
                    password_hash TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS user_sessions (
                    session_id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users(user_id)
                        ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS suggestions (
                    suggestion_id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    summary_type TEXT NOT NULL,
                    payload_json TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users(user_id)
                        ON DELETE CASCADE
                );
                """
            )

    def is_ready(self) -> bool:
        try:
            with self._connect() as connection:
                connection.execute("SELECT 1").fetchone()
            return True
        except sqlite3.Error:
            return False

    def register_user(
        self, display_name: str, email: str, password: str
    ) -> UserSession:
        user_id = str(uuid4())
        created_at = self._now()
        normalized_email = email.strip().lower()
        try:
            with self._connect() as connection:
                connection.execute(
                    """
                    INSERT INTO users (
                        user_id, display_name, email, password_hash, created_at
                    )
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (
                        user_id,
                        display_name.strip(),
                        normalized_email,
                        self._hash_password(password),
                        created_at,
                    ),
                )
        except sqlite3.IntegrityError as error:
            raise ValueError("An account already exists for this email.") from error
        return self._create_session(
            user_id, display_name.strip(), normalized_email
        )

    def sign_in(self, email: str, password: str) -> UserSession | None:
        normalized_email = email.strip().lower()
        with self._connect() as connection:
            row = connection.execute(
                """
                SELECT user_id, display_name, email, password_hash
                FROM users
                WHERE email = ?
                """,
                (normalized_email,),
            ).fetchone()
        if row is None or not self._verify_password(password, row[3]):
            return None
        return self._create_session(row[0], row[1], row[2])

    def get_session(self, session_id: str) -> UserSession | None:
        with self._connect() as connection:
            row = connection.execute(
                """
                SELECT
                    user_sessions.session_id,
                    users.user_id,
                    users.display_name,
                    users.email,
                    user_sessions.created_at
                FROM user_sessions
                JOIN users ON users.user_id = user_sessions.user_id
                WHERE user_sessions.session_id = ?
                """,
                (session_id,),
            ).fetchone()
        return UserSession(*row) if row else None

    def delete_session(self, session_id: str) -> bool:
        with self._connect() as connection:
            cursor = connection.execute(
                "DELETE FROM user_sessions WHERE session_id = ?",
                (session_id,),
            )
        return cursor.rowcount > 0

    def save_suggestion(
        self,
        user_id: str,
        title: str,
        summary_type: str,
        payload: dict[str, Any],
    ) -> SuggestionRecord:
        record = SuggestionRecord(
            suggestion_id=str(uuid4()),
            title=title,
            summary_type=summary_type,
            payload=payload,
            created_at=self._now(),
        )
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO suggestions (
                    suggestion_id,
                    user_id,
                    title,
                    summary_type,
                    payload_json,
                    created_at
                )
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    record.suggestion_id,
                    user_id,
                    record.title,
                    record.summary_type,
                    json.dumps(record.payload, separators=(",", ":")),
                    record.created_at,
                ),
            )
        return record

    def list_suggestions(self, user_id: str) -> list[SuggestionRecord]:
        with self._connect() as connection:
            rows = connection.execute(
                """
                SELECT
                    suggestion_id,
                    title,
                    summary_type,
                    payload_json,
                    created_at
                FROM suggestions
                WHERE user_id = ?
                ORDER BY created_at DESC, suggestion_id DESC
                """,
                (user_id,),
            ).fetchall()
        return [
            SuggestionRecord(
                suggestion_id=row[0],
                title=row[1],
                summary_type=row[2],
                payload=json.loads(row[3]),
                created_at=row[4],
            )
            for row in rows
        ]

    def count_users(self) -> int:
        with self._connect() as connection:
            row = connection.execute("SELECT COUNT(*) FROM users").fetchone()
        return int(row[0]) if row else 0

    def count_sessions(self) -> int:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT COUNT(*) FROM user_sessions"
            ).fetchone()
        return int(row[0]) if row else 0

    def _create_session(
        self, user_id: str, display_name: str, email: str
    ) -> UserSession:
        session = UserSession(
            session_id=secrets.token_urlsafe(32),
            user_id=user_id,
            display_name=display_name,
            email=email,
            created_at=self._now(),
        )
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO user_sessions (session_id, user_id, created_at)
                VALUES (?, ?, ?)
                """,
                (session.session_id, session.user_id, session.created_at),
            )
        return session

    @staticmethod
    def _hash_password(password: str) -> str:
        salt = os.urandom(16)
        iterations = 310_000
        digest = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt,
            iterations,
        )
        return (
            f"pbkdf2_sha256${iterations}$"
            f"{base64.b64encode(salt).decode('ascii')}$"
            f"{base64.b64encode(digest).decode('ascii')}"
        )

    @staticmethod
    def _verify_password(password: str, encoded: str) -> bool:
        try:
            algorithm, iterations_text, encoded_salt, encoded_digest = (
                encoded.split("$", maxsplit=3)
            )
            if algorithm != "pbkdf2_sha256":
                return False
            iterations = int(iterations_text)
            salt = base64.b64decode(encoded_salt)
            expected = base64.b64decode(encoded_digest)
        except (ValueError, TypeError):
            return False
        actual = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt,
            iterations,
        )
        return hmac.compare_digest(actual, expected)

    @staticmethod
    def _now() -> str:
        return datetime.now(timezone.utc).isoformat()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.path, timeout=5)
        connection.execute("PRAGMA foreign_keys = ON")
        return connection

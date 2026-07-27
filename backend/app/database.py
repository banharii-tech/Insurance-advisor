from __future__ import annotations

import os
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4


@dataclass(frozen=True)
class DemoSession:
    session_id: str
    created_at: str


class TemporaryDatabase:
    """Small SQLite store for disposable local V1 foundation data."""

    def __init__(self, path: Path | None = None) -> None:
        configured_path = os.getenv(
            "DATABASE_PATH", "/tmp/clearcover-v1.sqlite3"
        )
        self.path = path or Path(configured_path)

    def initialize(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self._connect() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS demo_sessions (
                    session_id TEXT PRIMARY KEY,
                    created_at TEXT NOT NULL
                )
                """
            )

    def is_ready(self) -> bool:
        try:
            with self._connect() as connection:
                connection.execute("SELECT 1").fetchone()
            return True
        except sqlite3.Error:
            return False

    def create_demo_session(self) -> DemoSession:
        session = DemoSession(
            session_id=str(uuid4()),
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO demo_sessions (session_id, created_at)
                VALUES (?, ?)
                """,
                (session.session_id, session.created_at),
            )
        return session

    def delete_demo_session(self, session_id: str) -> bool:
        with self._connect() as connection:
            cursor = connection.execute(
                "DELETE FROM demo_sessions WHERE session_id = ?",
                (session_id,),
            )
        return cursor.rowcount > 0

    def count_demo_sessions(self) -> int:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT COUNT(*) FROM demo_sessions"
            ).fetchone()
        return int(row[0]) if row else 0

    def _connect(self) -> sqlite3.Connection:
        return sqlite3.connect(self.path, timeout=5)

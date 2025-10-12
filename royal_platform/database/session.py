"""Database session management."""

from contextlib import contextmanager
from typing import Generator

from sqlalchemy.orm import Session

from .base import Base, SessionLocal, engine


def init_db() -> None:
    """Initialize database - create all tables."""
    Base.metadata.create_all(bind=engine)


def get_session() -> Session:
    """Get database session."""
    return SessionLocal()


@contextmanager
def get_db_session() -> Generator[Session, None, None]:
    """Database session context manager."""
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

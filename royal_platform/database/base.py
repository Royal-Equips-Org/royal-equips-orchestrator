"""Database base configuration."""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Database URL from environment  
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "sqlite:///./royal_equips.db"  # SQLite for local development
)

# Create engine with connection pooling
if DATABASE_URL.startswith("sqlite"):
    # SQLite does not support these pool options
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        pool_pre_ping=True,
    )
else:
    engine = create_engine(
        DATABASE_URL,
        pool_size=20,
        max_overflow=10,
        pool_pre_ping=True,
        pool_recycle=300,
    )

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for all models  
Base = declarative_base()
from sqlalchemy import create_engine, Column, String, Integer, DateTime, Text, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import json

Base = declarative_base()

class DataSession(Base):
    __tablename__ = "data_sessions"
    
    id = Column(String, primary_key=True)
    file_name = Column(String, nullable=False)
    file_type = Column(String, nullable=False)
    original_data_path = Column(String, nullable=False)
    processed_data_path = Column(String, nullable=True)
    schema_info = Column(Text, nullable=True)
    use_case = Column(Text, nullable=True)
    processing_recommendations = Column(Text, nullable=True)
    visualization_recommendations = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    row_count = Column(Integer, default=0)
    column_count = Column(Integer, default=0)

class ChartConfiguration(Base):
    __tablename__ = "chart_configurations"
    
    id = Column(String, primary_key=True)
    session_id = Column(String, nullable=False)
    chart_type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    x_axis = Column(String, nullable=False)
    y_axis = Column(String, nullable=False)
    configuration = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class ProcessingLog(Base):
    __tablename__ = "processing_logs"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String, nullable=False)
    operation = Column(String, nullable=False)
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

# Database setup
from config.settings import settings

engine = create_engine(settings.DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

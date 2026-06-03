"""
SQLAlchemy models for the AI Resume Analyzer platform.

This package contains all database models organized by domain.
"""
from app.models.base import Base, TimestampMixin, UUIDMixin, SoftDeleteMixin
from app.models.user import User
from app.models.cv_document import CVDocument
from app.models.pii_mapping import PIIMapping
from app.models.skill_report import SkillReport
from app.models.job_description import JobDescription
from app.models.analysis_record import AnalysisRecord
from app.models.gap_report import GapReport
from app.models.xai_report import XAIReport
from app.models.audit_log import AuditLog
from app.models.chat import ChatSession, ChatMessage
from app.models.interview import InterviewSession, InterviewQuestion, InterviewAnswer
from app.models.celery_task import CeleryTask, DeadLetterQueue
from app.models.feedback import Feedback
from app.models.talent_pool import TalentPool, TalentPoolCV
from app.models.pii_audit_trail import PIIAuditTrail
from app.models.dlq_record import DLQRecord
from app.models.testimonial import Testimonial
from app.models.batch_ranking_result import BatchRankingResult

__all__ = [
    # Base classes
    "Base",
    "TimestampMixin",
    "UUIDMixin",
    "SoftDeleteMixin",
    
    # User and authentication
    "User",
    
    # Document processing
    "CVDocument",
    "PIIMapping",
    "SkillReport",
    
    # Job descriptions
    "JobDescription",
    
    # Analysis
    "AnalysisRecord",
    "GapReport",
    "XAIReport",
    
    # Audit and compliance
    "AuditLog",
    "PIIAuditTrail",
    
    # Coaching
    "ChatSession",
    "ChatMessage",
    "InterviewSession",
    "InterviewQuestion",
    "InterviewAnswer",
    
    # Task management
    "CeleryTask",
    "DeadLetterQueue",
    "DLQRecord",
    
    # Feedback and Talent Management
    "Feedback",
    "TalentPool",
    "TalentPoolCV",
    
    # Testimonials
    "Testimonial",
    
    # Recruiter Batch Ranking Results
    "BatchRankingResult",
]

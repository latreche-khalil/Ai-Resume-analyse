"""
Recruiter Services Module.

This module provides services for recruiter-specific functionality:
- Batch ranking and candidate comparison
- Talent pool management
- ATS (Applicant Tracking System) features
"""
from app.services.recruiter.batch_ranking import batch_ranking_service

__all__ = ['batch_ranking_service']

from fastapi import APIRouter

# Import endpoint routers
from app.api.v1.endpoints import (
    auth, users, documents, analysis, job_descriptions, 
    coaching, recruiter, feedback, health, talent_pool, pdf_preview,
    advanced_analysis, testimonials
)

api_router = APIRouter()

# Include endpoint routers
api_router.include_router(auth.router, tags=["Authentication"])
api_router.include_router(users.router, tags=["Users"])
api_router.include_router(documents.router, tags=["Documents"])
api_router.include_router(pdf_preview.router, tags=["PDF Preview"])
api_router.include_router(analysis.router, tags=["Analysis"])
api_router.include_router(advanced_analysis.router, tags=["Advanced Analysis"])
api_router.include_router(job_descriptions.router, tags=["Job Descriptions"])
api_router.include_router(talent_pool.router, tags=["Talent Pool"])
api_router.include_router(coaching.router, tags=["Coaching"])
api_router.include_router(recruiter.router, tags=["Recruiter Tools"])
api_router.include_router(feedback.router, tags=["Feedback"])
api_router.include_router(testimonials.router, prefix="/testimonials", tags=["Testimonials"])
api_router.include_router(health.router, tags=["Health"])

@api_router.get("/")
async def root():
    return {
        "message": "AI Resume Analyzer & Career Mentor API",
        "version": "1.0.0",
        "status": "operational"
    }

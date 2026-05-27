"""
Testimonial model for customer reviews and ratings
"""
from sqlalchemy import Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import Base, UUIDType


class Testimonial(Base):
    """Customer testimonials and reviews"""
    __tablename__ = "testimonials"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # User info
    user_id = Column(UUIDType(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    name = Column(String(100), nullable=False)
    role = Column(String(100), nullable=True)
    company = Column(String(100), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    
    # Testimonial content
    content = Column(Text, nullable=False)
    rating = Column(Float, nullable=False)
    
    # Metadata
    is_featured = Column(Boolean, default=False)
    is_approved = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="testimonials")

    def __repr__(self):
        return f"<Testimonial {self.name} - {self.rating}★>"

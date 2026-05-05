"""
Unified LLM Client - OpenRouter Exclusive
Uses OpenRouter as the sole provider for all AI analysis.
"""
from typing import Optional
from app.utils.logger import logger
from app.core.config import settings

class UnifiedLLMClient:
    """
    Unified LLM client - using OpenRouter exclusively.
    """
    
    def __init__(self):
        """Initialize with lazy loading."""
        pass
        
    @property
    def openrouter_client(self):
        """Lazy load OpenRouter client."""
        from app.services.nlp.openrouter_client import openrouter_client
        return openrouter_client
    
    async def generate(
        self,
        prompt: str,
        task_type: str = "analysis",
        temperature: float = 0.7,
        max_tokens: int = 2048,
        use_fallback: bool = True
    ) -> Optional[str]:
        """
        Generate text using OpenRouter.
        """
        try:
            logger.info("Using OpenRouter for LLM generation")
            return await self.openrouter_client.generate(prompt=prompt, temperature=temperature, max_tokens=max_tokens)
        except Exception as e:
            logger.error(f"OpenRouter LLM failed: {str(e)}")
            return None
    
    async def generate_fast(
        self,
        prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 1024
    ) -> Optional[str]:
        """Quick generation for simple tasks."""
        return await self.generate(
            prompt=prompt,
            task_type="fast",
            temperature=temperature,
            max_tokens=max_tokens
        )
    
    async def generate_analysis(
        self,
        prompt: str,
        temperature: float = 0.3,
        max_tokens: int = 2048
    ) -> Optional[str]:
        """Analysis generation with lower temperature."""
        return await self.generate(
            prompt=prompt,
            task_type="analysis",
            temperature=temperature,
            max_tokens=max_tokens
        )
    
    async def generate_creative(
        self,
        prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 2048
    ) -> Optional[str]:
        """Creative generation with higher temperature."""
        return await self.generate(
            prompt=prompt,
            task_type="creative",
            temperature=temperature,
            max_tokens=max_tokens
        )


# Global unified LLM client instance
llm_client = UnifiedLLMClient()

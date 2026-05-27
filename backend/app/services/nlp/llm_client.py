"""
Unified LLM Client - Optimized with Groq (Primary)
Version: 1.2.1 (Active Groq Deployment)
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
    def groq_client(self):
        """Lazy load Groq client."""
        from app.services.nlp.groq_client import GroqClient
        # Use the provided Groq key
        groq_key = "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"
        client = GroqClient(api_key=groq_key)
        # Use the latest Llama 3.3 70B for superior reasoning
        client.model = "llama-3.3-70b-versatile"
        return client

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
        Generate text using Groq (Primary) or OpenRouter (Fallback).
        """
        import asyncio
        import datetime
        
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # 1. Try Groq (Primary)
        try:
            logger.info(f"Using Groq (Llama 3 8B) for LLM generation")
            result = await self.groq_client.generate(prompt=prompt, temperature=temperature, max_tokens=max_tokens)
            if result:
                return result
            raise Exception("Groq returned empty result")
        except Exception as e:
            error_msg = f"[{timestamp}] Groq LLM failed: {str(e)}"
            logger.error(error_msg)
            with open("critical_error_debug.txt", "a", encoding="utf-8") as f:
                f.write(f"{error_msg}\n")
            
            # 2. Fallback to OpenRouter
            max_retries = 2
            retry_delay = 1
            for attempt in range(max_retries):
                try:
                    logger.info(f"Using OpenRouter Fallback (Attempt {attempt + 1}/{max_retries})")
                    result = await self.openrouter_client.generate(prompt=prompt, temperature=temperature, max_tokens=max_tokens)
                    if result:
                        return result
                except Exception as or_e:
                    or_error_msg = f"[{timestamp}] OpenRouter Fallback Attempt {attempt+1} failed: {str(or_e)}"
                    logger.error(or_error_msg)
                    with open("critical_error_debug.txt", "a", encoding="utf-8") as f:
                        f.write(f"{or_error_msg}\n")
                    if attempt < max_retries - 1:
                        await asyncio.sleep(retry_delay)
            
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

"""
OpenRouter Client for LLM interactions - Async version.
"""
import httpx
import json
from typing import Optional, Dict, List
from app.core.config import settings
from app.utils.logger import logger

class OpenRouterClient:
    """
    Client for OpenRouter using Async HTTP.
    """
    
    def __init__(self):
        """Initialize OpenRouter client."""
        self.api_key = settings.OPENROUTER_API_KEY
        self.base_url = "https://openrouter.ai/api/v1/chat/completions"
        
        if not self.api_key:
            logger.warning("OPENROUTER_API_KEY not set, client will not work")
        
        # Best model for extraction/analysis: Gemini 2.0 Flash (Fast, Huge Context, Smart)
        self.model = "google/gemini-2.0-flash-001" 
        self.default_temperature = 0.3
        self.default_max_tokens = 2048
    
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        stream: bool = False
    ) -> str:
        try:
            temp = temperature if temperature is not None else self.default_temperature
            max_tok = max_tokens if max_tokens is not None else self.default_max_tokens
            
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://ai-resume-analyzer.com", # Optional
                "X-Title": "AI Resume Analyzer" # Optional
            }
            
            payload = {
                "model": self.model,
                "messages": messages,
                "temperature": temp,
                "max_tokens": max_tok
            }
            
            async with httpx.AsyncClient(timeout=90.0) as client:
                response = await client.post(self.base_url, headers=headers, json=payload)
                response.raise_for_status()
                result = response.json()
            
            if 'choices' not in result or not result['choices']:
                logger.error(f"Invalid OpenRouter response: {result}")
                raise ValueError("Empty or invalid response from OpenRouter API")
            
            content = result['choices'][0]['message']['content']
            if not content:
                raise ValueError("Empty content from OpenRouter API")
            
            return content
        except Exception as e:
            logger.error(f"OpenRouter API error: {str(e)}")
            raise
    
    async def generate(
        self,
        prompt: str,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None
    ) -> str:
        messages = [{"role": "user", "content": prompt}]
        return await self.chat_completion(
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens
        )

# Global instance
openrouter_client = OpenRouterClient()

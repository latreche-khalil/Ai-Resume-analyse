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
        else:
            masked_key = f"{self.api_key[:6]}...{self.api_key[-4:]}"
            logger.info(f"OpenRouterClient initialized with key: {masked_key}")
        
        # Using OpenRouter Free Models Router - Comprehensive free access
        self.model = "openrouter/free" 
        self.default_temperature = 0.3
        self.default_max_tokens = 2000 # Increased for more detailed XAI analysis
    
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        stream: bool = False
    ) -> str:
        # Triple-Model Fallback Strategy for maximum reliability on free tier
        models_to_try = [
            self.model, # Primary (openrouter/free)
            "google/gemini-2.0-flash-exp:free",
            "meta-llama/llama-3.1-8b-instruct:free",
            "mistralai/pixtral-12b:free"
        ]
        
        last_error = "Unknown error"
        
        for model_id in models_to_try:
            try:
                temp = temperature if temperature is not None else self.default_temperature
                max_tok = max_tokens if max_tokens is not None else self.default_max_tokens
                
                headers = {
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://ai-resume-analyzer.com",
                    "X-Title": "AI Resume Analyzer"
                }
                
                payload = {
                    "model": model_id,
                    "messages": messages,
                    "temperature": temp,
                    "max_tokens": max_tok
                }
                
                logger.info(f"Attempting OpenRouter analysis with model: {model_id}")
                
                async with httpx.AsyncClient(timeout=180.0) as client:
                    response = await client.post(self.base_url, headers=headers, json=payload)
                    
                    if response.status_code != 200:
                        logger.warning(f"Model {model_id} failed with status {response.status_code}. Details: {response.text[:100]}")
                        last_error = f"Status {response.status_code}: {response.text[:100]}"
                        continue # Try next model
                        
                    result = response.json()
                
                if 'choices' not in result or not result['choices']:
                    logger.warning(f"Invalid response from {model_id}. Trying next...")
                    continue
                
                content = result['choices'][0].get('message', {}).get('content')
                
                if not content or len(content.strip()) < 10:
                    logger.warning(f"Empty or too short content from {model_id}. Trying next...")
                    continue
                
                # Success!
                logger.info(f"Successful analysis completed using model: {model_id}")
                return content
                
            except Exception as e:
                logger.error(f"Error with model {model_id}: {str(e)}")
                last_error = str(e)
                continue # Try next model
                
        # If we reach here, all models failed
        logger.error(f"All LLM models failed. Last error: {last_error}")
        raise Exception(f"All AI analysis models are currently unavailable. Last error: {last_error}")
    
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

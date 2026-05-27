import httpx
import logging
import json
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

class GroqClient:
    """
    Client for Groq API - Extremely fast inference for Llama models.
    """
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.groq.com/openai/v1/chat/completions"
        self.model = "llama-3.3-70b-versatile" # Latest Top-Tier Model
        self.default_temperature = 0.2
        self.default_max_tokens = 3500

    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None
    ) -> str:
        try:
            temp = temperature if temperature is not None else self.default_temperature
            max_tok = max_tokens if max_tokens is not None else self.default_max_tokens
            
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": self.model,
                "messages": messages,
                "temperature": temp,
                "max_tokens": max_tok
            }
            
            logger.info(f"Sending request to Groq: Model={self.model}")
            
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(self.base_url, headers=headers, json=payload)
                
                if response.status_code != 200:
                    error_detail = response.text
                    logger.error(f"Groq API failed with status {response.status_code}: {error_detail}")
                    raise Exception(f"Groq API error {response.status_code}: {error_detail}")
                
                result = response.json()
            
            if 'choices' not in result or not result['choices']:
                raise ValueError("Invalid response structure from Groq")
            
            return result['choices'][0]['message']['content']
        except Exception as e:
            logger.error(f"Groq API Critical Error: {str(e)}")
            raise

    async def generate(self, prompt: str, system_prompt: str = "You are a helpful assistant.", **kwargs) -> str:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ]
        return await self.chat_completion(messages, **kwargs)

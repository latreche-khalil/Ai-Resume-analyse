"""
Agent Helper Functions
Eliminates repetitive patterns in AI agents
"""
from typing import Any, Dict, Optional, Callable
from functools import wraps
from app.utils.logger import logger
from app.utils.json_parser import parse_llm_json


def with_fallback(fallback_value: Any = None):
    """
    Decorator that provides graceful degradation for agent methods.
    
    Usage:
        @with_fallback(fallback_value=[])
        async def generate_data(self, ...):
            # Your code that might fail
            return result
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                return await func(*args, **kwargs)
            except Exception as e:
                logger.error(f"{func.__name__} error: {str(e)}")
                return fallback_value
        return wrapper
    return decorator


def with_json_fallback(fallback_dict: Dict[str, Any]):
    """
    Decorator for LLM calls that parse JSON with automatic fallback.
    
    Usage:
        @with_json_fallback({"skills": [], "score": 0.0})
        async def extract_skills(self, text: str):
            response = await llm_client.generate(...)
            return parse_llm_json(response)
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                result = await func(*args, **kwargs)
                # If result is string, try to parse it
                if isinstance(result, str):
                    return parse_llm_json(result)
                return result
            except Exception as e:
                logger.error(f"{func.__name__} JSON parsing error: {str(e)}")
                return fallback_dict
        return wrapper
    return decorator


async def safe_llm_call(
    llm_client,
    prompt: str,
    task_type: str = "analysis",
    temperature: float = 0.7,
    max_tokens: int = 1000,
    fallback: Optional[str] = None
) -> Optional[str]:
    """
    Safe LLM call with automatic error handling.
    
    Usage:
        response = await safe_llm_call(
            llm_client,
            prompt="Analyze this...",
            task_type="analysis",
            fallback="Default response"
        )
    """
    try:
        response = await llm_client.generate(
            prompt=prompt,
            task_type=task_type,
            temperature=temperature,
            max_tokens=max_tokens
        )
        return response
    except Exception as e:
        logger.error(f"LLM call failed: {str(e)}")
        return fallback


async def safe_llm_json_call(
    llm_client,
    prompt: str,
    fallback_dict: Dict[str, Any],
    task_type: str = "analysis",
    temperature: float = 0.7,
    max_tokens: int = 1000
) -> Dict[str, Any]:
    """
    Safe LLM call with JSON parsing and fallback.
    
    Usage:
        result = await safe_llm_json_call(
            llm_client,
            prompt="Return JSON: {...}",
            fallback_dict={"error": True}
        )
    """
    try:
        response = await llm_client.generate(
            prompt=prompt,
            task_type=task_type,
            temperature=temperature,
            max_tokens=max_tokens
        )
        
        if not response:
            return fallback_dict
        
        return parse_llm_json(response)
    except Exception as e:
        logger.error(f"LLM JSON call failed: {str(e)}")
        return fallback_dict

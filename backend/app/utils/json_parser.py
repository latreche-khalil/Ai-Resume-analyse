"""
Unified JSON Parser for LLM responses
Eliminates duplicate JSON parsing logic across agents
"""
import json
import re
from typing import Any, Union, Dict, List
from app.utils.logger import logger


class LLMJsonParser:
    """
    Unified JSON parser for LLM responses.
    Handles various response formats from different LLM providers.
    """
    
    @staticmethod
    def parse(response: str, default: Any = None) -> Union[Dict, List, Any]:
        """
        Parse JSON from LLM response.
        Supports both objects {} and arrays [].
        
        Args:
            response: Raw LLM response text
            default: Default value if parsing fails
            
        Returns:
            Parsed JSON (dict or list) or default value
        """
        if not response:
            logger.warning("Empty response provided to JSON parser")
            return default if default is not None else {}
        
        try:
            # Try direct parsing first (if response is clean JSON)
            stripped = response.strip()
            if stripped.startswith('[') or stripped.startswith('{'):
                return json.loads(stripped)
            
            # Try to find JSON array first (for list responses)
            arr_match = re.search(r'\[.*\]', response, re.DOTALL)
            if arr_match:
                try:
                    return json.loads(arr_match.group())
                except json.JSONDecodeError:
                    pass  # Continue to try object parsing
            
            # Try to find JSON object
            obj_match = re.search(r'\{.*\}', response, re.DOTALL)
            if obj_match:
                return json.loads(obj_match.group())
            
            logger.warning("No valid JSON found in LLM response")
            return default if default is not None else {}
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {e}")
            return default if default is not None else {}
        except Exception as e:
            logger.error(f"Unexpected error parsing JSON: {e}")
            return default if default is not None else {}
    
    @staticmethod
    def extract_json_object(response: str) -> Dict[str, Any]:
        """
        Extract JSON object from response.
        Always returns a dict.
        """
        result = LLMJsonParser.parse(response, default={})
        return result if isinstance(result, dict) else {}
    
    @staticmethod
    def extract_json_array(response: str) -> List[Any]:
        """
        Extract JSON array from response.
        Always returns a list.
        """
        result = LLMJsonParser.parse(response, default=[])
        return result if isinstance(result, list) else []
    
    @staticmethod
    def safe_get(data: Dict, key: str, default: Any = None) -> Any:
        """
        Safely get value from dict with default.
        """
        return data.get(key, default) if isinstance(data, dict) else default


# Global instance
json_parser = LLMJsonParser()


import asyncio
import httpx
import os
from dotenv import load_dotenv

async def list_models():
    load_dotenv()
    api_key = os.getenv("OPENROUTER_API_KEY")
    url = "https://openrouter.ai/api/v1/models"
    headers = {
        "Authorization": f"Bearer {api_key}"
    }
    
    print(f"Fetching available models for key: {api_key[:10]}...")
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, headers=headers)
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                models = data.get('data', [])
                print(f"Found {len(models)} models.")
                # Print first 10 models to see the slugs
                for m in models[:20]:
                    print(f" - {m.get('id')}")
            else:
                print(f"Error: {response.text}")
                
    except Exception as e:
        print(f"CRITICAL ERROR: {str(e)}")

if __name__ == "__main__":
    asyncio.run(list_models())

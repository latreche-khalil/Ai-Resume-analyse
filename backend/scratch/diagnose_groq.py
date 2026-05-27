import httpx
import asyncio
import sys

async def diagnose():
    api_key = "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"
    url = "https://api.groq.com/openai/v1/chat/completions"
    
    print(f"--- Diagnosing Groq Connection ---")
    print(f"Key: {api_key[:10]}...")
    
    payload = {
        "model": "llama3-70b-8192",
        "messages": [{"role": "user", "content": "Test: Say 'Hello Groq'"}],
        "max_tokens": 10
    }
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, headers=headers, json=payload)
            print(f"Status Code: {response.status_code}")
            if response.status_code == 200:
                print(f"SUCCESS! Response: {response.json()['choices'][0]['message']['content']}")
            else:
                print(f"FAILED! Error: {response.text}")
    except Exception as e:
        print(f"CRITICAL ERROR during connection: {str(e)}")

if __name__ == "__main__":
    asyncio.run(diagnose())

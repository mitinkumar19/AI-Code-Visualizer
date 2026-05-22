import os
from fastapi import FastAPI, HTTPException  # pyrefly: ignore [missing-import]
from pydantic import BaseModel  # pyrefly: ignore [missing-import]
from typing import List, Dict, Any, Optional
from executor import CodeExecutor  # pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware  # pyrefly: ignore [missing-import]
from dotenv import load_dotenv  # pyrefly: ignore [missing-import]
from groq import Groq  # pyrefly: ignore [missing-import]

from pathlib import Path  # pyrefly: ignore [missing-import]
from routes.upload import router as upload_router  # pyrefly: ignore [missing-import]

# Load .env from backend/ or project root
load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env")
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")

app = FastAPI(title="AI Code Visualizer API")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include upload route for code extraction
app.include_router(upload_router)

class RunRequest(BaseModel):
    code: str

class ExplainRequest(BaseModel):
    line: str
    state: Dict[str, Any]

@app.post("/run")
async def run_code(request: RunRequest):
    try:
        executor = CodeExecutor()
        result = executor.run(request.code)
        
        # Line numbers are now correct from the executor (no adjustment needed)
        return {
            "steps": result["steps"],
            "truncated": result.get("truncated", False)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/explain")
async def explain_step(request: ExplainRequest):
    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key:
        # Return a mock explanation if no API key is provided
        return {"explanation": f"Executing line: '{request.line}'. Current variables: {request.state}."}

    try:
        client = Groq(api_key=groq_api_key)
        prompt = f"""
        Provide a perfect, concise, and direct explanation of this Python code line's execution.
        Line of code: {request.line}
        Current variables state: {request.state}
        
        Explain exactly what this line evaluates to and how it modifies the program state or variables. Avoid generic conversational language; focus on the precise logic. Keep it under 2 sentences.
        """
        
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a helpful programming tutor."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.5,
            max_tokens=100,
        )
        
        explanation = completion.choices[0].message.content.strip()
        return {"explanation": explanation}
    except Exception as e:
        return {"explanation": f"Error generating explanation: {str(e)}"}

if __name__ == "__main__":
    import uvicorn  # pyrefly: ignore [missing-import]
    uvicorn.run(app, host="0.0.0.0", port=8000)

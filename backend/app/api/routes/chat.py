"""
API routes for Copilot chat functionality.
Uses OpenAI API to provide Valorant-focused AI assistance.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import os
import httpx

router = APIRouter(prefix="/api/chat", tags=["chat"])

def get_openai_api_key():
    """Get API key at runtime to ensure .env is loaded first."""
    return os.getenv("OPENAI_API_KEY", "")

class Message(BaseModel):
    role: str  # "user", "assistant", or "system"
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]
    player_stats: Optional[dict] = None

class ChatResponse(BaseModel):
    message: str
    error: Optional[str] = None

SYSTEM_PROMPT = """You are ValAI Copilot, an expert Valorant coach and statistics analyst. Your role is to:

1. ONLY discuss Valorant-related topics including:
   - Game mechanics, agents, abilities, weapons
   - Map strategies and callouts
   - Aiming techniques and crosshair placement
   - Performance analysis and improvement tips
   - Competitive play and ranked advice
   - The user's personal statistics (when provided)

2. If asked about non-Valorant topics, politely redirect the conversation back to Valorant.

3. When the user's stats are provided, use them to give personalized advice. Be encouraging but honest.

4. Keep responses concise and actionable.

5. Use Valorant terminology appropriately (e.g., "peek", "jiggle", "trade", "rotate", "lurk").

Remember: You are a helpful coach, not just an information bot. Provide insights that help players improve."""

def build_stats_context(stats: dict) -> str:
    """Build a context string from player stats."""
    if not stats:
        return ""
    
    context_parts = ["\n\n[PLAYER STATISTICS]"]
    
    if "stability" in stats:
        s = stats["stability"]
        context_parts.append(f"- Stability Score: {s.get('score', 'N/A')}/100 ({s.get('label', 'Unknown')})")
        context_parts.append(f"- Volatility: {s.get('volatility', 'N/A')}%")
        context_parts.append(f"- Average Headshot Rate: {s.get('avg_hs_rate', s.get('current_hs_rate', 'N/A'))}%")
        context_parts.append(f"- Matches Analyzed: {s.get('match_count', 'N/A')}")
        if s.get('description'):
            context_parts.append(f"- Assessment: {s.get('description')}")
    
    if "recent_matches" in stats and stats["recent_matches"]:
        context_parts.append("\nRecent Match Performance:")
        for i, match in enumerate(stats["recent_matches"][:5], 1):
            context_parts.append(f"  Match {i}: HS Rate {match.get('hs_rate', 'N/A'):.1f}%, {match.get('total_kills', 'N/A')} kills")
    
    context_parts.append("[END STATISTICS]\n")
    return "\n".join(context_parts)


@router.post("/completions", response_model=ChatResponse)
async def chat_completion(request: ChatRequest):
    """
    Send a chat completion request to OpenAI API.
    Includes player stats context and Valorant-focused system prompt.
    """
    api_key = get_openai_api_key()
    if not api_key:
        raise HTTPException(
            status_code=500, 
            detail="OpenAI API key not configured. Set OPENAI_API_KEY environment variable."
        )
    
    try:
        # Build the full system prompt with stats context
        full_system_prompt = SYSTEM_PROMPT
        if request.player_stats:
            full_system_prompt += build_stats_context(request.player_stats)
        
        # Prepare messages for OpenAI
        messages = [{"role": "system", "content": full_system_prompt}]
        
        for msg in request.messages:
            messages.append({"role": msg.role, "content": msg.content})
        
        # Call OpenAI API
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "gpt-3.5-turbo",
                    "messages": messages,
                    "max_tokens": 500,
                    "temperature": 0.7
                },
                timeout=30.0
            )
            
            if response.status_code != 200:
                error_detail = response.json().get("error", {}).get("message", "Unknown error")
                raise HTTPException(status_code=response.status_code, detail=error_detail)
            
            data = response.json()
            assistant_message = data["choices"][0]["message"]["content"]
            
            return ChatResponse(message=assistant_message)
            
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Request to OpenAI timed out")
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Failed to connect to OpenAI: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def chat_health():
    """Check if chat API is configured correctly."""
    api_key = get_openai_api_key()
    return {
        "status": "ok" if api_key else "not_configured",
        "has_api_key": bool(api_key)
    }

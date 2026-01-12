from fastapi import Header, HTTPException

from app.config import API_TOKEN


async def verify_token(authorization: str = Header(...)):
    """Bearer Token認証"""
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Invalid authorization header format. Use: Bearer <token>",
        )

    token = authorization[7:]  # "Bearer " を除去

    if token != API_TOKEN:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token",
        )

    return token

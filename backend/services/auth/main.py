from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from .database import engine, get_db

app = FastAPI(title="Seva Auth Service", version="1.0.0")

@app.on_event("startup")
async def startup():
    pass

@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok"}

@app.get("/db-health", tags=["health"])
async def db_health(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(text("SELECT 1"))
        return {"database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")
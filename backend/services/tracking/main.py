from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from .database import engine, get_db
from .models import Base
from .routers import trips, ws
from .metrics import PrometheusMiddleware, metrics_endpoint
from .routers import share

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup (for development)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(title="Seva Tracking Service", version="1.0.0", lifespan=lifespan)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add Prometheus middleware
app.add_middleware(PrometheusMiddleware)
app.add_route("/metrics", metrics_endpoint)

app.include_router(trips.router)
app.include_router(ws.router)
app.include_router(share.router)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/db-health")
async def db_health(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(text("SELECT 1"))
        return {"database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")
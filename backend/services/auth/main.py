from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from .database import engine, get_db
from .models import Base
from .routers import login, contacts, refresh
from .metrics import PrometheusMiddleware, metrics_endpoint
from .routers import internal
from .routers import otp
from fastapi.middleware.cors import CORSMiddleware
from .routers import register

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup for development; in production use Alembic migrations
    async with engine.begin() as conn: # pragma: no cover
        await conn.run_sync(Base.metadata.create_all)  # pragma: no cover
    yield
    await engine.dispose() # pragma: no cover


app = FastAPI(title="Seva Auth Service", version="1.0.0", lifespan=lifespan)
app.add_middleware(PrometheusMiddleware)
app.add_route("/metrics", metrics_endpoint)
ALLOWED_FRONTEND_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:8080",
    "http://localhost:5500",    # Very common for vanilla HTML/JS (VS Code Live Server)
    "http://127.0.0.1:5500",    # Alternative local loopback address
    "http://127.0.0.1:8080",
    "http://10.153.122.254:8080",
    "http://192.168.1.133:8080", # React development server
    # "https://yourdomain.com", # Uncomment and add your real domain when deployed!
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(register.router)
app.include_router(login.router)
app.include_router(contacts.router)
app.include_router(refresh.router)
app.include_router(internal.router)
app.include_router(otp.router)
 


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

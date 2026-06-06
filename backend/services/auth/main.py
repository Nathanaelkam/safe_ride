from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from .database import engine, get_db
from .models import Base
from .routers import login, contacts, refresh
from .metrics import PrometheusMiddleware, metrics_endpoint
from .routers import internal
from .routers import otp
from .routers import register

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup for development; in production use Alembic migrations
    async with engine.begin() as conn: # pragma: no cover
        await conn.run_sync(Base.metadata.create_all)  # pragma: no cover
        
        # Add missing email column if it doesn't exist
        result = await conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'email'
        """))
        
        if not result.fetchone():
            print("Adding email column to users table...")
            await conn.execute(text("""
                ALTER TABLE users 
                ADD COLUMN email VARCHAR(255) UNIQUE
            """))
            print("Email column added successfully!")
    yield
    await engine.dispose() # pragma: no cover


app = FastAPI(title="Seva Auth Service", version="1.0.0", lifespan=lifespan)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # Frontend origins
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)
app.add_middleware(PrometheusMiddleware)
app.add_route("/metrics", metrics_endpoint)

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

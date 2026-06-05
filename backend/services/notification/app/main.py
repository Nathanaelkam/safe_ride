import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.responses import PlainTextResponse
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
from .subscribers.alert_listener import run_subscriber
from fastapi.middleware.cors import CORSMiddleware

subscriber_task = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global subscriber_task
    print("Starting Notification Service...") # pragma: no cover
    subscriber_task = asyncio.create_task(run_subscriber()) # pragma: no cover
    yield # pragma: no cover
    print("Shutting down Notification Service...") # pragma: no cover
    if subscriber_task: # pragma: no cover
        subscriber_task.cancel() # pragma: no cover
        try: # pragma: no cover
            await subscriber_task # pragma: no cover
        except asyncio.CancelledError: # pragma: no cover
            pass # pragma: no cover

app = FastAPI(title="Notification Service", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8080"],        
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "notification"} # pragma: no cover


@app.get("/metrics", response_class=PlainTextResponse, tags=["observability"])
async def metrics():
    return PlainTextResponse(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST,
    )

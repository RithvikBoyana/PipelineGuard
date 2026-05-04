from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

from routers import deals, transcripts, user

load_dotenv()

app = FastAPI(title="PipelineGuard API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(deals.router, prefix="/deals", tags=["deals"])
app.include_router(transcripts.router, prefix="/deals", tags=["transcripts"])
app.include_router(user.router, prefix="/user", tags=["user"])


@app.get("/health")
def health():
    return {"status": "ok"}

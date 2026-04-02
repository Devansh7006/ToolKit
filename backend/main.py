from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from modules import arp, subdomain, dir_enum, downloader

app = FastAPI(title="Cyber Toolkit", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(arp.router, prefix="/api", tags=["ARP"])
app.include_router(subdomain.router, prefix="/api", tags=["Subdomain"])
app.include_router(dir_enum.router, prefix="/api", tags=["Directory"])
app.include_router(downloader.router, prefix="/api", tags=["Downloader"])

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/")
def root():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))

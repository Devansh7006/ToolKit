from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import requests
import os

router = APIRouter()

# Save downloads to Desktop/Downloads folder (user-friendly location)
DOWNLOAD_DIR = os.path.join(os.path.expanduser("~"), "Downloads", "CyberToolkit-Downloads")


class DownloadRequest(BaseModel):
    url: str
    filename: str


@router.post("/download")
def download_file(req: DownloadRequest):
    os.makedirs(DOWNLOAD_DIR, exist_ok=True)

    safe_name = os.path.basename(req.filename)
    if not safe_name:
        raise HTTPException(status_code=400, detail="Invalid filename")

    save_path = os.path.join(DOWNLOAD_DIR, safe_name)

    try:
        r = requests.get(req.url, allow_redirects=True, timeout=60, stream=True)
        r.raise_for_status()

        with open(save_path, "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)

        size = os.path.getsize(save_path)
        return {
            "status": "success",
            "file": safe_name,
            "path": save_path,
            "size_bytes": size
        }
    except requests.exceptions.HTTPError as e:
        raise HTTPException(status_code=400, detail=f"HTTP error: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import requests
import os
import json
from concurrent.futures import ThreadPoolExecutor, as_completed

router = APIRouter()

WORDLIST_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "wordlist.txt")
MAX_WORKERS = 30

STATUS_LABELS = {200: "FOUND", 301: "REDIRECT", 302: "REDIRECT", 403: "FORBIDDEN"}


class DirScanRequest(BaseModel):
    target: str


def _check(url):
    try:
        r = requests.get(url, timeout=3, allow_redirects=False)
        if r.status_code in STATUS_LABELS:
            return {"url": url, "status": r.status_code, "label": STATUS_LABELS[r.status_code]}
    except Exception:
        pass
    return None


@router.post("/dir-scan")
def dir_scan(req: DirScanRequest):
    target = req.target.rstrip("/") + "/"
    try:
        wl = WORDLIST_PATH if os.path.exists(WORDLIST_PATH) else "wordlist.txt"
        with open(wl, "r") as f:
            words = [l.strip() for l in f if l.strip()]
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="wordlist.txt not found")

    urls = [target + w + "/" for w in words]
    results = []

    def stream():
        total = len(urls)
        completed = 0
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as ex:
            futures = {ex.submit(_check, u): u for u in urls}
            for future in as_completed(futures):
                completed += 1
                result = future.result()
                if result:
                    results.append(result)
                    yield json.dumps({"type": "hit", "data": result, "progress": completed, "total": total}) + "\n"
                elif completed % 100 == 0:
                    yield json.dumps({"type": "progress", "progress": completed, "total": total}) + "\n"
        yield json.dumps({"type": "done", "results": results, "count": len(results)}) + "\n"

    return StreamingResponse(stream(), media_type="application/x-ndjson")

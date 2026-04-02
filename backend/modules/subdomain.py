from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import requests
import os
import json
from concurrent.futures import ThreadPoolExecutor, as_completed

router = APIRouter()

WORDLIST_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "wordlist.txt")
MAX_WORKERS = 50


class SubdomainRequest(BaseModel):
    domain: str


def _check(sub, domain):
    url = f"http://{sub}.{domain}"
    try:
        resp = requests.get(url, timeout=3, allow_redirects=True)
        if resp.status_code < 400:
            return {"subdomain": url, "status": resp.status_code}
    except Exception:
        pass
    return None


@router.post("/subdomain-scan")
def subdomain_scan(req: SubdomainRequest):
    try:
        wl = WORDLIST_PATH if os.path.exists(WORDLIST_PATH) else "wordlist.txt"
        with open(wl, "r") as f:
            words = [l.strip() for l in f if l.strip()]
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="wordlist.txt not found")

    found = []

    def stream():
        total = len(words)
        completed = 0
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as ex:
            futures = {ex.submit(_check, w, req.domain): w for w in words}
            for future in as_completed(futures):
                completed += 1
                result = future.result()
                if result:
                    found.append(result)
                    yield json.dumps({"type": "hit", "data": result, "progress": completed, "total": total}) + "\n"
                elif completed % 100 == 0:
                    yield json.dumps({"type": "progress", "progress": completed, "total": total}) + "\n"
        yield json.dumps({"type": "done", "found": found, "count": len(found)}) + "\n"

    return StreamingResponse(stream(), media_type="application/x-ndjson")

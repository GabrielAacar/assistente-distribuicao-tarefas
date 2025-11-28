from fastapi import APIRouter

router = APIRouter(prefix="/api")

@router.get("/status")
def status():
    return {"status": "ok", "service": "backend"}

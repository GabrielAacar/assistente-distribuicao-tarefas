from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.distribuir import router as distribuir_router
from app.routes.status import router


app = FastAPI(title="Mini Ambiente Local")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(distribuir_router)

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, List, Optional

router = APIRouter(prefix="/api")

# ----------------------------------
# MODELOS
# ----------------------------------

class DTConfig(BaseModel):
    max: int
    status: Optional[str] = "pendente"

class Tarefa(BaseModel):
    dt: str
    movorder: str
    zona: str
    tarefa: Optional[str] = ""
    volume: Optional[int] = 0

class Payload(BaseModel):
    dts: Dict[str, DTConfig]
    zonas: Dict[str, List[str]]
    tarefas: List[Tarefa]

# ----------------------------------
# ENDPOINT
# ----------------------------------

@router.post("/distribuir")
def distribuir(payload: Payload):

    script = []
    status_por_dt = {}

    for tarefa in payload.tarefas:
        status_por_dt[tarefa.dt] = "concluido"
        script.append(
            f"-- DT {tarefa.dt} | {tarefa.movorder} | {tarefa.zona}"
        )

    return {
        "ok": True,
        "script": "\n".join(script),
        "status_por_dt": status_por_dt
    }

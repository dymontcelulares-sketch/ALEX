import os, time, hashlib, hmac, secrets
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from ia import ask_ai

app = FastAPI(title="ALEX API", version="1.0.0")
# Para produção, configure ALEX_ALLOWED_ORIGINS com a URL HTTPS do frontend.
origins = [x.strip() for x in os.getenv("ALEX_ALLOWED_ORIGINS", "*").split(",") if x.strip()]
app.add_middleware(
    CORSMiddleware, allow_origins=origins, allow_credentials=False,
    allow_methods=["GET", "POST"], allow_headers=["Content-Type"]
)

# Demo de instância única: em produção use banco persistente e rate limiting.
owner_hash: Optional[bytes] = None
owner_salt: Optional[bytes] = None
unlock_tokens = {}

class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=4000)

class PinIn(BaseModel):
    pin: str = Field(min_length=4, max_length=12, pattern=r"^[0-9]+$")

def pin_digest(pin: str, salt: bytes) -> bytes:
    return hashlib.pbkdf2_hmac("sha256", pin.encode(), salt, 250_000)

@app.get("/")
def root():
    return {"name": "ALEX API", "version": "1.0.0", "status": "online"}

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/owner/setup")
def setup_owner(data: PinIn):
    global owner_hash, owner_salt
    if owner_hash is not None:
        raise HTTPException(409, "O PIN já foi cadastrado nesta instância. Redefinição segura ainda não está habilitada.")
    owner_salt = secrets.token_bytes(16)
    owner_hash = pin_digest(data.pin, owner_salt)
    return {"ok": True, "message": "PIN configurado nesta instância do servidor."}

@app.post("/owner/unlock")
def unlock_owner(data: PinIn):
    if owner_hash is None or owner_salt is None:
        raise HTTPException(400, "Cadastre o PIN primeiro.")
    candidate = pin_digest(data.pin, owner_salt)
    if not hmac.compare_digest(candidate, owner_hash):
        time.sleep(1)
        raise HTTPException(401, "PIN incorreto.")
    token = secrets.token_urlsafe(32)
    unlock_tokens[token] = time.time() + 120
    return {"ok": True, "token": token, "expires_in": 120, "message": "PIN correto. Este token vale 2 minutos; ainda não habilita exclusões."}

@app.post("/chat")
async def chat(data: ChatIn):
    text = data.message.strip()
    if not text:
        raise HTTPException(400, "Mensagem vazia.")
    # A IA só conversa. Não existe ferramenta de exclusão de arquivos.
    return {"reply": await ask_ai(text)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")))

import os
import httpx

SYSTEM = (
    "Você é ALEX, um assistente pessoal que fala português brasileiro, de forma natural e útil. "
    "Responda de maneira clara e concisa. Você não tem acesso direto ao dispositivo nem aos arquivos. "
    "Não afirme ter executado ações que não foram realizadas. Nunca solicite senhas ou PINs. "
    "Não forneça nem execute comandos para apagar em massa os arquivos do usuário."
)

async def ask_ai(message: str) -> str:
    # Provedores são opcionais. A chave fica apenas no backend.
    # Ordem: OpenRouter (modelos gratuitos se configurados) -> Gemini -> OpenAI compatível.
    openrouter_key = os.getenv("OPENROUTER_API_KEY")
    openrouter_model = os.getenv("OPENROUTER_MODEL", "openrouter/free")
    if openrouter_key:
        result = await _openai_compatible(
            "https://openrouter.ai/api/v1/chat/completions",
            openrouter_key, openrouter_model, message,
            extra_headers={"HTTP-Referer": os.getenv("FRONTEND_URL", ""), "X-Title": "ALEX"}
        )
        if result:
            return result

    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key:
        model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        async with httpx.AsyncClient(timeout=25) as client:
            r = await client.post(url, params={"key": gemini_key}, json={
                "system_instruction": {"parts": [{"text": SYSTEM}]},
                "contents": [{"parts": [{"text": message}]}],
                "generationConfig": {"temperature": 0.6, "maxOutputTokens": 500}
            })
            if r.is_success:
                data = r.json()
                try:
                    return data["candidates"][0]["content"]["parts"][0]["text"]
                except (KeyError, IndexError, TypeError):
                    pass

    api_key = os.getenv("OPENAI_API_KEY")
    if api_key:
        model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        result = await _openai_compatible(
            "https://api.openai.com/v1/chat/completions",
            api_key, model, message
        )
        if result:
            return result

    return ("Ainda não há um provedor de IA configurado ou os provedores disponíveis falharam. "
            "Adicione uma chave em Environment no Render (OPENROUTER_API_KEY, GEMINI_API_KEY ou OPENAI_API_KEY).")

async def _openai_compatible(url, key, model, message, extra_headers=None):
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    headers.update({k:v for k,v in (extra_headers or {}).items() if v})
    try:
        async with httpx.AsyncClient(timeout=25) as client:
            r = await client.post(url, headers=headers, json={
                "model": model,
                "messages": [{"role":"system","content":SYSTEM},{"role":"user","content":message}],
                "temperature": 0.6, "max_tokens": 500
            })
            if not r.is_success:
                return None
            return r.json()["choices"][0]["message"]["content"]
    except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError):
        return None

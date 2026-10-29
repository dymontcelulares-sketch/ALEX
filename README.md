# ALEX 1.0

Assistente web em português brasileiro com reconhecimento de voz do navegador, síntese de fala, informações limitadas do dispositivo, seleção manual de arquivos e backend FastAPI.

## Rodar localmente

```bash
python -m venv .venv
pip install -r requirements.txt
uvicorn main:app --reload
```

Abra `http://localhost:8000` para a API. Para a interface, sirva os arquivos estáticos por um servidor local ou publique-os em um host HTTPS (por exemplo, GitHub Pages/Netlify).

## Configuração da IA

Defina no ambiente do backend uma ou mais chaves:
- `OPENROUTER_API_KEY` (pode tentar modelos gratuitos; limites variam)
- `GEMINI_API_KEY`
- `OPENAI_API_KEY` (pode gerar custos)

Opcionalmente configure `OPENROUTER_MODEL`, `GEMINI_MODEL`, `OPENAI_MODEL`, `FRONTEND_URL` e `ALEX_ALLOWED_ORIGINS`.

## Frontend -> backend

Em `script.js`, defina `window.ALEX_API_URL` antes de carregar o script para apontar para a URL HTTPS do backend Render. Exemplo:
```html
<script>window.ALEX_API_URL = "https://SUA-API.onrender.com";</script>
<script src="dispositivo.js"></script>
<script src="arquivos.js"></script>
<script src="script.js"></script>
```

## Segurança — leia antes de publicar

- O reconhecimento de fala do navegador **não é autenticação biométrica**.
- O PIN de demonstração fica apenas na memória do processo; ele é perdido ao reiniciar e não é adequado para produção. Use banco persistente, limites de tentativas, proteção contra abuso e recuperação segura antes de uso real.
- O token de desbloqueio ainda não autoriza operações sensíveis; não há endpoint para apagar arquivos.
- O backend não pode acessar o armazenamento do celular. `arquivos.js` só lê arquivos que o usuário seleciona explicitamente.
- Configure `ALEX_ALLOWED_ORIGINS` para a origem exata do frontend antes de produção.
- Não coloque chaves de API no frontend nem as envie para o GitHub.
- A API de IA pode gerar custos; configure limites no painel do provedor.

from fastapi import FastAPI, Request, HTTPException
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
import logging
import json
import os
from typing import Callable

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("siniestros")

app = FastAPI(
    title="FastAPI Siniestros",
    version="1.0",
    docs_url="/docs",
    redoc_url=None
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.middleware("http")
async def filter_bot_requests(request: Request, call_next: Callable):
    path = request.url.path
    user_agent = request.headers.get("user-agent", "").lower()
    
    bot_paths = [
        "/wp-", "/.git", "/xmlrpc.php", "/backup", "/.env", "/config",
        "/server-status", "/docker-compose", "/.svn", "/.ssh", "/aws",
        "/db/", "/phpinfo", "/settings.py", "/web.config", "/.vscode",
        "/dump.sql", "/server.key", "/secrets.json"
    ]
    
    bot_agents = [
        "bot", "spider", "crawler", "probe", "scan", "slurp", "curl",
        "wget", "python-requests", "go-http-client", "httpclient"
    ]
    
    is_bot_path = any(bot_path in path for bot_path in bot_paths)
    is_bot_agent = any(agent in user_agent for agent in bot_agents)
    
    if is_bot_path or is_bot_agent:
        return JSONResponse(
            status_code=404,
            content={"detail": "Recurso no encontrado"},
            headers={"X-Bot-Blocked": "True"}
        )
    
    response = await call_next(request)
    if response.status_code == 404:
        logger.warning(f"404 para la ruta: {path}")
    return response

app.mount("/web", StaticFiles(directory=os.path.join(os.path.dirname(__file__), "../web"), html=True), name="web")

@app.get("/", include_in_schema=False)
async def swagger_ui():
    return get_swagger_ui_html(openapi_url="/openapi.json", title="Documentación API")

@app.get("/web", include_in_schema=False)
async def web():
    return FileResponse(os.path.join(os.path.dirname(__file__), "../web/index.html"))

@app.post("/listener")
async def listener(request: Request):
    try:
        json_data = await request.json()
        logger.info(f"Recibido (JSON): {json.dumps(json_data, indent=2)}")
        response = {"mensaje": "Recibido correctamente", "data": json_data}
    except Exception:
        body = await request.body()
        logger.info(f"Recibido (Texto Plano): {body.decode()}")
        response = {"mensaje": "Recibido como texto plano", "data": body.decode()}
    logger.info(f"Respuesta enviada: {json.dumps(response, indent=2)}")
    return JSONResponse(content=response, status_code=200)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8008, reload=True)

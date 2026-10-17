import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.backup import run_backup
from app.config import settings

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时自动备份（异步执行不阻塞启动，幂等：同一天只备份一次）
    import asyncio
    asyncio.create_task(run_backup())
    yield


app = FastAPI(
    title=settings.APP_NAME,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=settings.CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "ok"}


from app.api import api_router

app.include_router(api_router, prefix=settings.API_PREFIX)

# 挂载 uploads 目录为静态文件服务
os.makedirs(UPLOAD_DIR, exist_ok=True)


class CachedStaticFiles(StaticFiles):
    """uploads 文件名自带 md5+uuid 前缀永不冲突，可放心使用一年期不可变缓存。"""

    async def get_response(self, path: str, scope):
        response = await super().get_response(path, scope)
        if response.status_code == 200:
            response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        return response


app.mount("/uploads", CachedStaticFiles(directory=UPLOAD_DIR), name="uploads")

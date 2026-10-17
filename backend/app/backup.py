"""启动时自动备份：pg_dump 数据库 + 打包 uploads 目录。

触发时机：FastAPI lifespan 启动钩子（无论 bat / docker compose / Docker Desktop 恢复容器，
只要后端启动就会触发）。幂等设计：同一天只备份一次，重复启动自动跳过。
保留策略：默认保留最近 14 天，超期自动删除。
"""
import asyncio
import logging
import os
import subprocess
import tarfile
from datetime import datetime, timedelta
from pathlib import Path
from urllib.parse import urlparse

from app.config import settings

logger = logging.getLogger(__name__)

BACKUP_DIR = Path(os.getenv("BACKUP_DIR", "/backups"))
RETENTION_DAYS = int(os.getenv("BACKUP_RETENTION_DAYS", "14"))
UPLOADS_DIR = Path(os.getenv("UPLOADS_DIR", "/app/uploads"))


def _parse_sync_db_url() -> tuple[str, str, str, str, str]:
    """从 DATABASE_URL_SYNC 解析 pg_dump 连接参数，返回 (user, password, host, port, dbname)。"""
    u = urlparse(settings.DATABASE_URL_SYNC)
    return (
        u.username or "captureos",
        u.password or "captureos",
        u.hostname or "db",
        str(u.port or 5432),
        (u.path or "/captureos").lstrip("/"),
    )


async def run_backup() -> None:
    """启动钩子入口：异步执行，失败只记日志不影响服务启动。"""
    try:
        await asyncio.to_thread(_do_backup)
    except Exception as e:
        logger.warning("自动备份失败（不影响服务运行）: %s", e)


def _do_backup() -> None:
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)

    today = datetime.now().strftime("%Y-%m-%d")
    prefix = f"captureos-{today}"
    sql_path = BACKUP_DIR / f"{prefix}.sql"

    # 幂等：今天已备份过则跳过
    if sql_path.exists():
        logger.info("今天已备份过，跳过")
        return

    logger.info("开始备份 → %s", BACKUP_DIR)

    # 1. 数据库 SQL 备份（通过 docker exec 调用 db 容器的 pg_dump）
    with open(sql_path, "wb") as f:
        subprocess.run(
            ["docker", "exec", "captureos-db-1", "pg_dump", "-U", "captureos", "-Fc", "captureos"],
            stdout=f, check=True,
        )
    logger.info("  SQL 备份完成: %s", sql_path.name)

    # 2. 附件目录打包
    tar_path = BACKUP_DIR / f"{prefix}-uploads.tar.gz"
    if UPLOADS_DIR.exists():
        with tarfile.open(tar_path, "w:gz") as tar:
            for item in UPLOADS_DIR.iterdir():
                tar.add(item, arcname=item.name)
        logger.info("  附件打包完成: %s", tar_path.name)

    # 3. 清理超期备份
    cutoff = datetime.now() - timedelta(days=RETENTION_DAYS)
    deleted = 0
    for f in BACKUP_DIR.glob("captureos-*"):
        try:
            d = datetime.strptime(f.name[10:20], "%Y-%m-%d")
            if d < cutoff:
                f.unlink()
                deleted += 1
        except (ValueError, OSError):
            continue
    if deleted:
        logger.info("  已清理 %d 个超期备份（保留 %d 天）", deleted, RETENTION_DAYS)

    logger.info("备份完成")

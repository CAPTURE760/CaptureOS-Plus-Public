"""数据导出 API — 全量/按模块导出数据为 JSON 下载。"""
import json
from datetime import date, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models import (
    Project,
    Experience,
    Issue,
    Solution,
    Knowledge,
    Decision,
    Review,
    Tag,
    EntityTag,
    Relation,
    RelationType,
)
from app.models.file_attachment import FileAttachment

router = APIRouter(prefix="/export", tags=["export"])


def _serialize_row(row: Any) -> dict:
    """将 SQLAlchemy row 对象转为可 JSON 序列化的 dict。"""
    d = {}
    for col in row.__table__.columns:
        val = getattr(row, col.name)
        if isinstance(val, datetime):
            val = val.isoformat()
        elif isinstance(val, date):
            val = val.isoformat()
        d[col.name] = val
    return d


async def _fetch_all(db: AsyncSession, model) -> list[dict]:
    result = await db.execute(select(model))
    return [_serialize_row(r) for r in result.scalars().all()]


# 可选模块键：与前端 ExportButton 的 ENTITY_OPTIONS 保持一致
ENTITY_MODULES = {
    "projects": Project,
    "experiences": Experience,
    "issues": Issue,
    "solutions": Solution,
    "knowledge": Knowledge,
    "decisions": Decision,
    "reviews": Review,
}


@router.get("/")
async def export_all(
    types: str | None = Query(None, description="逗号分隔的模块键，如 projects,issues；不传=全量"),
    db: AsyncSession = Depends(get_db),
):
    """导出数据为 JSON 文件下载。types 指定时只导所选模块，关联表按所选模块过滤。"""
    if types:
        keys = [t.strip() for t in types.split(",") if t.strip()]
        invalid = [k for k in keys if k not in ENTITY_MODULES]
        if invalid:
            raise HTTPException(
                status_code=400,
                detail=f"无效的模块: {','.join(invalid)}，可选值: {','.join(ENTITY_MODULES)}",
            )
        if not keys:
            raise HTTPException(status_code=400, detail="types 不能为空")
        selected = set(keys)

        # 所选实体模块
        data: dict[str, Any] = {
            key: await _fetch_all(db, ENTITY_MODULES[key]) for key in ENTITY_MODULES if key in selected
        }
        # 全局表（标签/关系类型）始终带上，导入端依赖
        data["tags"] = await _fetch_all(db, Tag)
        data["relation_types"] = await _fetch_all(db, RelationType)
        # 多态关联表：只保留指向所选模块的行，避免导入孤儿数据
        data["entity_tags"] = [
            r for r in await _fetch_all(db, EntityTag) if r["entity_type"] in selected
        ]
        data["relations"] = [
            r for r in await _fetch_all(db, Relation)
            if r["source_type"] in selected and r["target_type"] in selected
        ]
        data["file_attachments"] = [
            r for r in await _fetch_all(db, FileAttachment) if r["entity_type"] in selected
        ]
    else:
        data = {
            "projects": await _fetch_all(db, Project),
            "experiences": await _fetch_all(db, Experience),
            "issues": await _fetch_all(db, Issue),
            "solutions": await _fetch_all(db, Solution),
            "knowledge": await _fetch_all(db, Knowledge),
            "decisions": await _fetch_all(db, Decision),
            "reviews": await _fetch_all(db, Review),
            "tags": await _fetch_all(db, Tag),
            "entity_tags": await _fetch_all(db, EntityTag),
            "relation_types": await _fetch_all(db, RelationType),
            "relations": await _fetch_all(db, Relation),
            "file_attachments": await _fetch_all(db, FileAttachment),
        }

    payload = {
        "exported_at": datetime.now().isoformat(),
        "version": "1.0",
        "data": data,
    }

    json_bytes = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")

    return Response(
        content=json_bytes,
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=captureos-export.json"},
    )

"""提醒 API — 聚合需要关注的事项：未关闭问题 + 进行中项目。"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.issue import Issue
from app.models.project import Project

router = APIRouter(prefix="/reminders", tags=["reminders"])

# 提醒分组配置：(分组key, 中文标签, 模型, 关注状态, 单条entity_type)
REMINDER_GROUPS = [
    ("issues", "待解决问题", Issue, ("open", "in_progress"), "issue"),
    ("projects", "进行中项目", Project, ("active",), "project"),
]

ITEMS_PER_GROUP = 5

# 优先级排序权重：紧急 > 高 > 中 > 低 > 无
PRIORITY_WEIGHT = {"紧急": 4, "高": 3, "中": 2, "低": 1}


@router.get("/")
async def get_reminders(db: AsyncSession = Depends(get_db)):
    """返回提醒分组列表：每组含真实计数（SQL 下推）+ 按优先级/创建时间排序的前 5 条。

    items 附带 days_open（创建至今天数），前端据此展示「停滞 N 天」警示。
    """
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    groups = []
    total = 0
    for gtype, label, model, statuses, entity_type in REMINDER_GROUPS:
        condition = model.status.in_(statuses)
        count = (
            await db.execute(select(func.count(model.id)).where(condition))
        ).scalar_one()
        # 先取最近 50 条再做内存排序（提醒量级小，避免 SQL CASE 复杂度）
        result = await db.execute(
            select(model).where(condition).order_by(model.created_at.desc()).limit(50)
        )
        rows = list(result.scalars().all())
        # created_at 可能为 aware/naive，统一剥掉 tzinfo（DB 存 UTC）后再比较
        rows.sort(key=lambda m: (
            -(PRIORITY_WEIGHT.get(getattr(m, "priority", None), 0)),
            m.created_at.replace(tzinfo=None) if m.created_at else now,
        ))
        items = []
        for item in rows[:ITEMS_PER_GROUP]:
            created = item.created_at.replace(tzinfo=None) if item.created_at else None
            items.append({
                "entity_type": entity_type,
                "entity_id": item.id,
                "title": item.title,
                "status": item.status,
                "priority": getattr(item, "priority", None),
                "days_open": max((now - created).days, 0) if created else None,
                "created_at": created.isoformat() if created else None,
            })
        groups.append({"type": gtype, "label": label, "count": count, "items": items})
        total += count

    return {"groups": groups, "total": total}

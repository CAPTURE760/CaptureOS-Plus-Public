"""提醒 API — 聚合需要关注的事项：未关闭问题 + 进行中项目。"""
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


@router.get("/")
async def get_reminders(db: AsyncSession = Depends(get_db)):
    """返回提醒分组列表：每组含真实计数（SQL 下推）+ 最新前 5 条。"""
    groups = []
    total = 0
    for gtype, label, model, statuses, entity_type in REMINDER_GROUPS:
        condition = model.status.in_(statuses)
        count = (
            await db.execute(select(func.count(model.id)).where(condition))
        ).scalar_one()
        result = await db.execute(
            select(model)
            .where(condition)
            .order_by(model.created_at.desc())
            .limit(ITEMS_PER_GROUP)
        )
        items = [
            {
                "entity_type": entity_type,
                "entity_id": item.id,
                "title": item.title,
                "status": item.status,
                "priority": getattr(item, "priority", None),
                "created_at": item.created_at.isoformat() if item.created_at else None,
            }
            for item in result.scalars().all()
        ]
        groups.append({"type": gtype, "label": label, "count": count, "items": items})
        total += count

    return {"groups": groups, "total": total}

"""Search API — 支持中文子串匹配、标签筛选、日期范围和真实计数。"""
from datetime import date, datetime, time, timedelta, timezone
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.decision import Decision
from app.models.experience import Experience
from app.models.issue import Issue
from app.models.knowledge import Knowledge
from app.models.project import Project
from app.models.review import Review
from app.models.solution import Solution
from app.models.tag import EntityTag

router = APIRouter(prefix="/search", tags=["search"])

# 搜索配置：(类型名, 模型, 搜索字段列表)
SEARCH_CONFIG = [
    ("project", Project, [Project.title, Project.description]),
    ("experience", Experience, [Experience.title, Experience.summary, Experience.lesson]),
    ("issue", Issue, [Issue.title, Issue.description, Issue.root_cause]),
    ("solution", Solution, [Solution.title, Solution.description, Solution.approach]),
    ("knowledge", Knowledge, [Knowledge.title, Knowledge.content]),
    ("decision", Decision, [Decision.title, Decision.background, Decision.reason]),
    ("review", Review, [Review.title, Review.event_summary]),
]


@router.get("/")
async def search(
    q: str | None = Query(None),
    entity_type: str | None = None,
    tag_id: int | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    limit: int = Query(20, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    results = []
    type_counts: dict[str, int] = {}
    total = 0

    # 前端传的是北京时间日期，转成带时区的 datetime 边界下推到 SQL 比较
    # （DB 存 UTC timestamptz，直接比较 date 会差 8 小时导致边界数据丢失）
    BEIJING_TZ = timezone(timedelta(hours=8))
    start_dt = datetime.combine(start_date, time.min, tzinfo=BEIJING_TZ) if start_date else None
    # end_date 取次日 0 点做开区间上界，避免漏掉当天 23:59:59 之前的记录
    end_dt = datetime.combine(end_date + timedelta(days=1), time.min, tzinfo=BEIJING_TZ) if end_date else None

    for etype, model, search_fields in SEARCH_CONFIG:
        if entity_type and etype != entity_type:
            continue

        conditions = []
        if q:
            # 有关键词：ILIKE 子串匹配
            conditions.append(or_(*[field.ilike(f"%{q}%") for field in search_fields]))

        # 日期/标签过滤必须下推到 SQL WHERE，在 LIMIT 之前生效，
        # 否则先截断 20 条再内存过滤会丢掉范围内的数据
        if start_dt:
            conditions.append(model.created_at >= start_dt)
        if end_dt:
            conditions.append(model.created_at < end_dt)
        if tag_id is not None:
            conditions.append(
                model.id.in_(
                    select(EntityTag.entity_id).where(
                        EntityTag.tag_id == tag_id,
                        EntityTag.entity_type == etype,
                    )
                )
            )

        query = select(model)
        if conditions:
            query = query.where(*conditions)
        # 真实计数下推 SQL（与结果同条件，不受 limit 影响）
        count_query = select(func.count(model.id))
        if conditions:
            count_query = count_query.where(*conditions)
        type_count = (await db.execute(count_query)).scalar_one()
        type_counts[etype] = type_count
        total += type_count
        # 最新优先；offset/limit 用于前端单类型分页（每页 20 条）
        query = query.order_by(model.created_at.desc()).offset(offset).limit(limit)

        result = await db.execute(query)
        items = result.scalars().all()

        for item in items:
            # 获取创建时间
            created_at = None
            if hasattr(item, "created_at") and item.created_at:
                created_at = item.created_at.isoformat()

            results.append({
                "entity_type": etype,
                "entity_id": item.id,
                "title": item.title,
                "snippet": _get_snippet(item, search_fields, q) if q else "",
                "created_at": created_at,
            })

    return {
        "query": q or "",
        "results": results,
        "total": total,
        "type_counts": type_counts,
    }


def _get_snippet(item, fields, query: str | None) -> str:
    """从匹配字段中提取包含查询词的片段。"""
    if not query:
        return ""
    for field in fields:
        value = getattr(item, field.name, None)
        if value and query.lower() in value.lower():
            idx = value.lower().index(query.lower())
            start = max(0, idx - 50)
            end = min(len(value), idx + len(query) + 50)
            snippet = value[start:end]
            if start > 0:
                snippet = "..." + snippet
            if end < len(value):
                snippet = snippet + "..."
            return snippet
    return ""

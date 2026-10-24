"""Timeline API — 支持 7 种实体 + 链路聚合。"""
from datetime import date, datetime, timezone, timedelta
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import Date, cast, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.auth.deps import get_current_user
from app.models.decision import Decision
from app.models.experience import Experience
from app.models.issue import Issue
from app.models.knowledge import Knowledge
from app.models.project import Project
from app.models.relation import Relation, RelationType
from app.models.review import Review
from app.models.solution import Solution
from app.models.user import User

# 北京时间（created_at 以 UTC 存储，展示/比较统一转上海时区）
SHANGHAI_TZ = timezone(timedelta(hours=8))

router = APIRouter(prefix="/timeline", tags=["timeline"])

# 链路聚合用的关系类型
CHAIN_RELATION_TYPES = {"solved_by", "caused_by", "learned_from", "follows", "part_of", "related_to"}

# 所有实体配置：(模型, 日期字段名, 类型名)
ENTITY_CONFIGS = [
    (Project, "start_date", "project"),
    (Experience, "event_date", "experience"),
    (Issue, "discovered_date", "issue"),
    (Solution, "implemented_date", "solution"),
    (Knowledge, "created_at", "knowledge"),
    (Decision, "decision_date", "decision"),
    (Review, "review_date", "review"),
]


def _get_date(item, date_field_name: str) -> date | None:
    """安全获取实体日期，统一返回 date 对象。"""
    d = getattr(item, date_field_name, None)
    if d is None:
        d = getattr(item, "created_at", None)
    if d is None:
        return None
    # datetime → date
    if hasattr(d, "date") and callable(d.date):
        return d.date()
    # 已经是 date
    if isinstance(d, date):
        return d
    return None


def _get_datetime(item, date_field_name: str) -> str | None:
    """获取实体的完整时间戳，返回 ISO 格式字符串。"""
    from datetime import datetime as dt
    d = getattr(item, date_field_name, None)
    if d is None:
        d = getattr(item, "created_at", None)
    if d is None:
        return None
    if isinstance(d, dt):
        return d.isoformat()
    if isinstance(d, date):
        return d.isoformat()
    return None


def _sql_range_cond(col, start: date | None, end: date | None):
    """生成单列的日期范围 SQL 条件。"""
    if start and end:
        return col.between(start, end)
    if start:
        return col >= start
    return col <= end


def _sql_date_condition(model, date_field_name: str, start: date | None, end: date | None):
    """构建"业务日期 OR 创建时间（北京时间）"任一在范围内的 SQL 条件，
    与原 _in_range 内存过滤语义一致，但下推到 WHERE 在 LIMIT 之前生效。"""
    biz_col = getattr(model, date_field_name)
    # created_at 是 UTC timestamptz，转上海时区后取日期与前端传的北京日期对齐
    created_date = cast(func.timezone("Asia/Shanghai", model.created_at), Date)
    return or_(_sql_range_cond(biz_col, start, end), _sql_range_cond(created_date, start, end))


async def _get_min_date(db: AsyncSession, user_id: int) -> str | None:
    """全部数据的最早日期（业务日期与创建时间取更早者，统一为北京时间日期）。"""
    min_dates: list[date] = []
    for model, date_field_name, _etype in ENTITY_CONFIGS:
        biz_min = (await db.execute(
            select(func.min(getattr(model, date_field_name))).where(model.user_id == user_id)
        )).scalar_one()
        created_min = (await db.execute(
            select(func.min(model.created_at)).where(model.user_id == user_id)
        )).scalar_one()
        # 统一归一化为 date：business 字段可能是 Date 也可能是 created_at（naive datetime，UTC 存储）
        if created_min:
            if created_min.tzinfo is None:
                created_min = created_min.replace(tzinfo=timezone.utc)
            min_dates.append(created_min.astimezone(SHANGHAI_TZ).date())
        if biz_min:
            min_dates.append(biz_min.date() if isinstance(biz_min, datetime) else biz_min)
    return min(min_dates).isoformat() if min_dates else None


@router.get("/")
async def get_timeline(
    start_date: date | None = None,
    end_date: date | None = None,
    entity_type: str | None = None,
    limit: int = Query(20, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    events = []
    total = 0
    cumulative = 0  # 全局分页游标：已越过类型的累计条数

    for model, date_field_name, etype in ENTITY_CONFIGS:
        if entity_type and etype != entity_type:
            continue

        # 日期条件下推 SQL（业务日期 OR 北京时间创建日期），在 LIMIT 之前生效
        conditions = [model.user_id == current_user.id]
        if start_date or end_date:
            conditions.append(_sql_date_condition(model, date_field_name, start_date, end_date))

        count_query = select(func.count(model.id)).where(*conditions)
        type_total = (await db.execute(count_query)).scalar_one()
        total += type_total

        # 全局分页：列表按（类型固定顺序 + 类型内时间倒序）排列，把全局切片
        # [offset, offset+limit) 映射到该类型的子区间，保证任意页都是全局连续的 20 条
        type_start = cumulative  # 该类型第一个元素在全局列表中的下标
        cumulative += type_total
        t_offset = max(0, offset - type_start)
        t_limit = min(type_total, offset + limit - type_start) - t_offset
        if t_limit <= 0:
            continue

        query = select(model).where(*conditions)
        # 最新优先；按映射后的区间取数
        query = query.order_by(model.created_at.desc()).offset(t_offset).limit(t_limit)
        result = await db.execute(query)
        for item in result.scalars().all():
            d = _get_date(item, date_field_name)

            entry: dict[str, Any] = {
                "entity_type": etype,
                "entity_id": item.id,
                "title": item.title,
                "date": d.isoformat() if d else None,
                "datetime": _get_datetime(item, "created_at"),
            }
            # 附加额外字段
            if hasattr(item, "status"):
                entry["status"] = item.status
            if hasattr(item, "rating") and item.rating:
                entry["rating"] = item.rating
            if hasattr(item, "effectiveness") and item.effectiveness:
                entry["effectiveness"] = item.effectiveness
            events.append(entry)

    events.sort(key=lambda x: (x["entity_type"], x["datetime"] or x["date"] or "0000-01-01"), reverse=True)
    return {
        "events": events,
        "total": total,
        "min_date": await _get_min_date(db, current_user.id),
    }


@router.get("/chains")
async def get_timeline_chains(
    start_date: date | None = None,
    end_date: date | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """链路聚合时间线。范围内实体全量加载后按链分页（保证链不被拆散）。"""
    # 1. 收集实体（按创建时间倒序，只取最近 limit 条；日期条件下推 SQL）
    all_entities: dict[str, dict] = {}
    for model, date_field_name, etype in ENTITY_CONFIGS:
        query = select(model).where(model.user_id == current_user.id)
        if start_date or end_date:
            query = query.where(_sql_date_condition(model, date_field_name, start_date, end_date))
        # 全量加载：链路聚合依赖完整实体集合，limit 截断会产生残缺链
        query = query.order_by(model.created_at.desc())
        result = await db.execute(query)
        for item in result.scalars().all():
            d = _get_date(item, date_field_name)
            key = f"{etype}:{item.id}"
            all_entities[key] = {
                "entity_type": etype,
                "entity_id": item.id,
                "title": item.title,
                "date": d.isoformat() if d else None,
                "datetime": _get_datetime(item, "created_at"),
            }

    # 2. 查链路关系，用 Union-Find 分组
    parent: dict[str, str] = {}

    def find(x: str) -> str:
        if x not in parent:
            parent[x] = x
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a: str, b: str) -> None:
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb

    # 初始化所有实体为独立组
    for key in all_entities:
        parent[key] = key

    # 查关系
    type_result = await db.execute(select(RelationType))
    type_map = {rt.id: rt.name for rt in type_result.scalars().all()}
    chain_type_ids = [tid for tid, name in type_map.items() if name in CHAIN_RELATION_TYPES]

    if chain_type_ids:
        rel_query = select(Relation).where(Relation.relation_type_id.in_(chain_type_ids))
        rel_result = await db.execute(rel_query)
        for rel in rel_result.scalars().all():
            src = f"{rel.source_type}:{rel.source_id}"
            tgt = f"{rel.target_type}:{rel.target_id}"
            if src in parent and tgt in parent:
                union(src, tgt)

    # 3. 按根节点分组
    groups: dict[str, list[dict]] = {}
    for key, entity in all_entities.items():
        root = find(key)
        groups.setdefault(root, []).append(entity)

    # 4. 构建结果
    chains = []
    for entities in groups.values():
        if len(entities) == 1:
            e = entities[0]
            chains.append({
                "type": "single",
                "title": e["title"],
                "date": e["date"],
                "datetime": e.get("datetime"),
                "entity": e,
            })
        else:
            issues = [e for e in entities if e["entity_type"] == "issue"]
            title = issues[0]["title"] if issues else entities[0]["title"]
            dates = [e["date"] for e in entities if e["date"]]
            latest_date = max(dates) if dates else None
            datetimes = [e["datetime"] for e in entities if e.get("datetime")]
            latest_datetime = max(datetimes) if datetimes else None
            chains.append({
                "type": "chain",
                "title": title,
                "date": latest_date,
                "datetime": latest_datetime,
                "entity_count": len(entities),
                "entities": sorted(entities, key=lambda x: x["datetime"] or x["date"] or "0000-01-01"),
            })

    def _chain_sort_key(c):
        if c["type"] == "single" and c.get("entity"):
            return (c["entity"]["entity_type"], c["entity"].get("datetime") or c["date"] or "0000-01-01")
        if c.get("entities"):
            return (c["entities"][0]["entity_type"], c.get("date") or "0000-01-01")
        return ("zzz", c.get("date") or "0000-01-01")

    chains.sort(key=_chain_sort_key, reverse=True)
    # 按链分页（page/page_size），链本身不会被拆散
    start_idx = (page - 1) * page_size
    return {
        "chains": chains[start_idx:start_idx + page_size],
        "total": len(chains),
        "min_date": await _get_min_date(db, current_user.id),
    }

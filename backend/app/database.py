from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

# 异步引擎用于API路由
async_engine = create_async_engine(settings.DATABASE_URL)
async_session = async_sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)

# 创建Base类
class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """异步Session依赖注入"""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise

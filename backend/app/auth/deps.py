"""认证依赖：get_current_user。

SINGLE_USER_MODE=True（本地）时，自动返回默认用户，跳过 JWT 校验。
SINGLE_USER_MODE=False（生产）时，必须从 Authorization header 解析 JWT。
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.auth.security import decode_token
from app.config import settings
from app.models.user import User

security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    # 本地单用户模式：自动以默认用户身份操作，无需登录
    if settings.SINGLE_USER_MODE:
        result = await db.execute(select(User).where(User.username == settings.DEFAULT_USERNAME))
        user = result.scalar_one_or_none()
        if user is None:
            # 本地首次启动时若默认用户不存在，自动创建
            from app.auth.security import hash_password
            user = User(
                username=settings.DEFAULT_USERNAME,
                password_hash=hash_password("local-only"),
                is_admin=True,
                is_active=True,
            )
            db.add(user)
            await db.flush()
        return user

    # 生产模式：必须携带有效 JWT
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="未登录",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="登录已过期，请重新登录",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = int(payload["sub"])
    result = await db.execute(select(User).where(User.id == user_id, User.is_active == True))  # noqa: E712
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户不存在或已停用")
    return user

"""认证 API：验证码、登录、用户管理（管理员）。"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.auth.captcha import generate_captcha, verify_captcha
from app.auth.deps import get_current_user
from app.auth.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.schemas.user import (
    LoginRequest,
    LoginResponse,
    UserCreate,
    UserResponse,
    UserUpdate,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/config")
async def get_auth_config():
    """公开接口：返回认证模式配置，前端据此决定是否要求登录。

    注意：不能用 NEXT_PUBLIC_ 环境变量传递（构建时固化），
    必须运行时从后端获取，保证同一份前端镜像两种模式通用。
    """
    from app.config import settings
    return {"single_user_mode": settings.SINGLE_USER_MODE}


@router.get("/captcha")
async def get_captcha():
    """获取验证码图片，返回 captcha_id 和 base64/png。"""
    captcha_id, png_bytes = generate_captcha()
    return Response(content=png_bytes, media_type="image/png", headers={
        "X-Captcha-Id": captcha_id,
        "Access-Control-Expose-Headers": "X-Captcha-Id",
    })


@router.post("/login", response_model=LoginResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    """登录：校验验证码 → 校验密码 → 签发 JWT。"""
    # 1. 校验验证码
    if not verify_captcha(data.captcha_id, data.captcha_code):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="验证码错误或已过期")

    # 2. 查找用户
    result = await db.execute(select(User).where(User.username == data.username))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户名或密码错误")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="账号已停用")

    # 3. 签发 token
    token = create_access_token(user.id, user.username)
    return LoginResponse(access_token=token, user=UserResponse.model_validate(user))


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """获取当前登录用户信息。"""
    return current_user


# ── 管理员：用户管理 ──

@router.get("/users", response_model=list[UserResponse])
async def list_users(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """列出所有用户（仅管理员）。"""
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权限")
    result = await db.execute(select(User).order_by(User.id))
    return result.scalars().all()


@router.post("/users", response_model=UserResponse, status_code=201)
async def create_user(
    data: UserCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """创建用户（仅管理员，不开放注册）。"""
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权限")

    # 检查用户名是否已存在
    existing = await db.execute(select(User).where(User.username == data.username))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="用户名已存在")

    user = User(
        username=data.username,
        password_hash=hash_password(data.password),
        is_admin=data.is_admin,
        is_active=True,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """更新用户信息（仅管理员）。"""
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权限")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="用户不存在")

    update_data = data.model_dump(exclude_unset=True)
    if "password" in update_data and update_data["password"]:
        user.password_hash = hash_password(update_data["password"])
    if "is_admin" in update_data:
        user.is_admin = update_data["is_admin"]
    if "is_active" in update_data:
        user.is_active = update_data["is_active"]

    await db.flush()
    await db.refresh(user)
    return user

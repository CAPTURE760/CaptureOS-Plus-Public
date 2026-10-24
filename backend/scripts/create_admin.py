"""创建或更新用户（默认为管理员，加 --no-admin 创建普通用户）。

用法：
    # 创建/更新管理员
    python -m scripts.create_admin --username admin --password <password>
    ADMIN_USERNAME=admin ADMIN_PASSWORD=<password> python -m scripts.create_admin

    # 创建/更新普通用户
    python -m scripts.create_admin --username zhangsan --password <password> --no-admin

    # 带备注
    python -m scripts.create_admin --username zhangsan --password <password> --no-admin --display-name "张三"
"""
import argparse
import asyncio
import os
import sys

# 确保 backend 目录在 sys.path 中
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select

from app.auth.security import hash_password
from app.database import async_session
from app.models.user import User


async def create_user(username: str, password: str, is_admin: bool, display_name: str | None = None) -> None:
    async with async_session() as db:
        result = await db.execute(select(User).where(User.username == username))
        user = result.scalar_one_or_none()

        if user:
            user.password_hash = hash_password(password)
            user.is_admin = is_admin
            user.is_active = True
            if display_name is not None:
                user.display_name = display_name
            action = "更新"
        else:
            user = User(
                username=username,
                display_name=display_name,
                password_hash=hash_password(password),
                is_admin=is_admin,
                is_active=True,
            )
            db.add(user)
            action = "创建"

        await db.commit()
        role = "管理员" if is_admin else "普通用户"
        name = f"（{display_name}）" if display_name else ""
        print(f"✓ 已{action}{role}用户: {username}{name}")


def main() -> None:
    parser = argparse.ArgumentParser(description="创建或更新用户（默认管理员）")
    parser.add_argument("--username", default=os.getenv("ADMIN_USERNAME", "admin"), help="用户名")
    parser.add_argument("--password", default=os.getenv("ADMIN_PASSWORD"), help="密码")
    parser.add_argument("--display-name", default=None, help="备注/显示名")
    parser.add_argument("--no-admin", action="store_true", help="创建普通用户而非管理员")
    args = parser.parse_args()

    if not args.password:
        print("错误：请通过 --password 参数或 ADMIN_PASSWORD 环境变量提供密码", file=sys.stderr)
        sys.exit(1)

    asyncio.run(create_user(args.username, args.password, is_admin=not args.no_admin, display_name=args.display_name))


if __name__ == "__main__":
    main()

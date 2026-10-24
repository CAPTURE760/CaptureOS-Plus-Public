"""创建或更新管理员用户。

用法：
    python -m scripts.create_admin --username admin --password <password>
或通过环境变量：
    ADMIN_USERNAME=admin ADMIN_PASSWORD=<password> python -m scripts.create_admin
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


async def create_admin(username: str, password: str) -> None:
    async with async_session() as db:
        result = await db.execute(select(User).where(User.username == username))
        user = result.scalar_one_or_none()

        if user:
            user.password_hash = hash_password(password)
            user.is_admin = True
            user.is_active = True
            action = "更新"
        else:
            user = User(
                username=username,
                password_hash=hash_password(password),
                is_admin=True,
                is_active=True,
            )
            db.add(user)
            action = "创建"

        await db.commit()
        print(f"✓ 已{action}管理员用户: {username}")


def main() -> None:
    parser = argparse.ArgumentParser(description="创建或更新管理员用户")
    parser.add_argument("--username", default=os.getenv("ADMIN_USERNAME", "admin"), help="管理员用户名")
    parser.add_argument("--password", default=os.getenv("ADMIN_PASSWORD"), help="管理员密码")
    args = parser.parse_args()

    if not args.password:
        print("错误：请通过 --password 参数或 ADMIN_PASSWORD 环境变量提供密码", file=sys.stderr)
        sys.exit(1)

    asyncio.run(create_admin(args.username, args.password))


if __name__ == "__main__":
    main()

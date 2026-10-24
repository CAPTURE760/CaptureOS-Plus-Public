"""add users table and user_id to all entity tables

Revision ID: 014
Revises: 013
Create Date: 2026-10-25

"""
from typing import Sequence, Union

import sqlalchemy as sa
from passlib.context import CryptContext

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "014"
down_revision: Union[str, None] = "013"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# 需要加 user_id 的实体表
ENTITY_TABLES = [
    "projects",
    "experiences",
    "issues",
    "solutions",
    "knowledge",
    "decisions",
    "reviews",
]

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def upgrade() -> None:
    # 1. 建 users 表
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("username", sa.String(length=50), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_username", "users", ["username"], unique=True)

    # 2. 清空所有实体表数据（多用户改造，每个用户一份空数据）
    for table in ENTITY_TABLES + ["tags", "entity_tags", "relations", "file_attachments"]:
        op.execute(f"TRUNCATE TABLE {table} RESTART IDENTITY CASCADE")

    # 3. 7 个实体表 + tags 表加 user_id 列
    for table in ENTITY_TABLES + ["tags"]:
        op.add_column(
            table,
            sa.Column("user_id", sa.Integer(), nullable=True),
        )
        op.create_foreign_key(
            f"fk_{table}_user_id",
            table,
            "users",
            ["user_id"],
            ["id"],
        )
        op.create_index(f"ix_{table}_user_id", table, ["user_id"])

    # 4. tags 表：移除原 name 唯一约束，改为 (user_id, name) 联合唯一
    op.drop_constraint("tags_name_key", "tags", type_="unique")
    op.create_unique_constraint("uq_tags_user_id_name", "tags", ["user_id", "name"])

    # 5. 创建默认 admin 用户（本地单用户模式使用，生产环境应修改密码）
    admin_hash = pwd_context.hash("admin123")
    op.execute(
        sa.text(
            "INSERT INTO users (username, password_hash, is_admin, is_active) "
            "VALUES (:username, :password_hash, :is_admin, :is_active)"
        ).bindparams(
            username="admin",
            password_hash=admin_hash,
            is_admin=True,
            is_active=True,
        )
    )


def downgrade() -> None:
    # 1. 删除默认 admin 用户
    op.execute("DELETE FROM users WHERE username = 'admin'")

    # 2. tags 表：恢复 name 唯一约束，移除 (user_id, name) 联合唯一
    op.drop_constraint("uq_tags_user_id_name", "tags", type_="unique")
    op.create_unique_constraint("tags_name_key", "tags", ["name"])

    # 3. 删除 user_id 列
    for table in ENTITY_TABLES + ["tags"]:
        op.drop_index(f"ix_{table}_user_id", table_name=table)
        op.drop_constraint(f"fk_{table}_user_id", table, type_="foreignkey")
        op.drop_column(table, "user_id")

    # 4. 删除 users 表
    op.drop_index("ix_users_username", table_name="users")
    op.drop_table("users")

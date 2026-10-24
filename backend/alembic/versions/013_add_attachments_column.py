"""add attachments column to all entity tables

Revision ID: 013
Revises: 012
Create Date: 2026-10-24

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "013"
down_revision: Union[str, None] = "012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 使用 JSON 类型（JSONB 在 PostgreSQL 上等价于 JSON，且更高效）
    # 与各模型定义保持一致：project/issue/solution/knowledge/experience 用 JSON，
    # decision/review 用 JSONB
    op.add_column("projects", sa.Column("attachments", sa.JSON(), nullable=True))
    op.add_column("issues", sa.Column("attachments", sa.JSON(), nullable=True))
    op.add_column("solutions", sa.Column("attachments", sa.JSON(), nullable=True))
    op.add_column("knowledge", sa.Column("attachments", sa.JSON(), nullable=True))
    op.add_column("experiences", sa.Column("attachments", sa.JSON(), nullable=True))
    op.add_column("decisions", sa.Column("attachments", postgresql.JSONB(), nullable=True))
    op.add_column("reviews", sa.Column("attachments", postgresql.JSONB(), nullable=True))


def downgrade() -> None:
    op.drop_column("reviews", "attachments")
    op.drop_column("decisions", "attachments")
    op.drop_column("experiences", "attachments")
    op.drop_column("knowledge", "attachments")
    op.drop_column("solutions", "attachments")
    op.drop_column("issues", "attachments")
    op.drop_column("projects", "attachments")

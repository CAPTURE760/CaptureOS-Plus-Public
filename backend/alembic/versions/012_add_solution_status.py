"""add solution status

Revision ID: 012
Revises: 011
Create Date: 2025-01-09 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '012'
down_revision = '011'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 添加 status 字段到 solutions 表，默认值为 'pending'
    op.add_column('solutions', sa.Column('status', sa.String(length=20), nullable=False, server_default='pending'))

    # 更新现有数据，将所有现有方案设为 'pending'
    op.execute("UPDATE solutions SET status = 'pending' WHERE status IS NULL")

    # 创建索引
    op.create_index(op.f('ix_solutions_status'), 'solutions', ['status'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_solutions_status'), table_name='solutions')
    op.drop_column('solutions', 'status')

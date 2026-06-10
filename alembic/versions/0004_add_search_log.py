"""add search_logs table

Revision ID: 0004
Revises: 0003
Create Date: 2026-06-10
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "search_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("username", sa.String(50), nullable=False),
        sa.Column("tin", sa.String(20), nullable=False),
        sa.Column("searched_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_search_logs_username", "search_logs", ["username"])


def downgrade() -> None:
    op.drop_index("ix_search_logs_username", table_name="search_logs")
    op.drop_table("search_logs")

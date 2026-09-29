"""drop search_logs table

The per-user search history endpoint was removed; the lookup page now shows
recently crawled organizations from /orgs instead.

Revision ID: 0005
Revises: 0004
Create Date: 2026-09-29
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_index("ix_search_logs_username", table_name="search_logs")
    op.drop_table("search_logs")


def downgrade() -> None:
    op.create_table(
        "search_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("username", sa.String(50), nullable=False),
        sa.Column("tin", sa.String(20), nullable=False),
        sa.Column("searched_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_search_logs_username", "search_logs", ["username"])

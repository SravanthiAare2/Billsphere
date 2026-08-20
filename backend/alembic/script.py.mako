"""${message}

Revision ID: ${up_revision}
Revises: ${down_revision | comma,n}
Create Date: ${create_date}

"""

from typing import Sequence, Union

from alembic import op

import sqlalchemy as sa


${imports if imports else ""}



# ==========================================================
# Revision Identifiers
# ==========================================================

revision: str = ${repr(up_revision)}

down_revision: Union[str, Sequence[str], None] = ${repr(down_revision)}

branch_labels: Union[str, Sequence[str], None] = ${repr(branch_labels)}

depends_on: Union[str, Sequence[str], None] = ${repr(depends_on)}



# ==========================================================
# Upgrade Migration
# ==========================================================

def upgrade() -> None:

    """
    Apply database changes.
    """

    ${upgrades if upgrades else "pass"}



# ==========================================================
# Downgrade Migration
# ==========================================================

def downgrade() -> None:

    """
    Reverse database changes.
    """

    ${downgrades if downgrades else "pass"}
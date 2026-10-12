from typing import Literal

from pydantic import BaseModel, ConfigDict


class MoveIn(BaseModel):
    """Body of the "move up / down" admin routes (skills, projects)."""

    model_config = ConfigDict(extra="forbid")

    direction: Literal["up", "down"]

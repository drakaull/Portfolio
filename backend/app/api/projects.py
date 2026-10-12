from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.dependencies import get_project_repository
from app.domain.language import Lang
from app.domain.project import Project, ProjectContext
from app.infra.repositories.project import ProjectRepository

router = APIRouter(tags=["projects"])

Repository = Annotated[ProjectRepository, Depends(get_project_repository)]


class LanguageShare(BaseModel):
    name: str
    percent: float  # of the repository's code, one decimal


class ProjectOut(BaseModel):
    """Public card data; the page design is decided once the real projects are in."""

    title: str
    summary: str | None
    context: ProjectContext | None
    team_size: int | None
    url: str
    homepage: str | None
    languages: list[LanguageShare]  # largest first
    topics: list[str]
    created_at: datetime
    pushed_at: datetime
    stars: int

    @classmethod
    def from_domain(cls, project: Project, lang: Lang) -> "ProjectOut":
        repository = project.repository
        total = sum(repository.languages.values()) or 1
        return cls(
            title=project.title,
            # The original "About" until its translation exists.
            summary=project.summary.get(lang) or repository.about,
            context=project.context,
            team_size=project.team_size,
            url=repository.url,
            homepage=repository.homepage,
            languages=[
                LanguageShare(name=name, percent=round(100 * size / total, 1))
                for name, size in sorted(
                    repository.languages.items(), key=lambda item: item[1], reverse=True
                )
            ],
            topics=list(repository.topics),
            created_at=repository.created_at,
            pushed_at=repository.pushed_at,
            stars=repository.stars,
        )


@router.get("/projects")
async def list_projects(lang: Lang, repository: Repository) -> list[ProjectOut]:
    """Visible projects, in the admin's order."""
    return [
        ProjectOut.from_domain(project, lang)
        for project in await repository.list()
        if project.visible
    ]

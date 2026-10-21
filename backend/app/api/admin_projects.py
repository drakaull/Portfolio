from dataclasses import replace
from datetime import datetime
from typing import Annotated

from fastapi import Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field

from app.api.common import MoveIn
from app.api.dependencies import (
    admin_router,
    get_github_client,
    get_project_repository,
    get_translator,
)
from app.api.home import PhotoFocus
from app.domain.language import with_every_lang
from app.domain.project import TEAM_SIZE_MAX, TITLE_MAX_LENGTH, Project, ProjectContext
from app.infra.github import GitHubClient, GitHubUnavailable
from app.infra.project_sync import sync_projects
from app.infra.repositories.project import ProjectRepository
from app.infra.storage import delete_image, image_url
from app.infra.translation import Translator

router = admin_router()

Repository = Annotated[ProjectRepository, Depends(get_project_repository)]


class ProjectDetailsIn(BaseModel):
    """What the admin edits; everything else comes from GitHub."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    title: str = Field(min_length=1, max_length=TITLE_MAX_LENGTH)
    context: ProjectContext | None = None
    team_size: int | None = Field(default=None, ge=1, le=TEAM_SIZE_MAX)
    visible: bool = False
    image_focus: PhotoFocus | None = None  # None: the framing stays as it is


class GitHubOut(BaseModel):
    id: int
    name: str
    url: str
    homepage: str | None
    about: str | None
    languages: dict[str, int]
    topics: list[str]
    created_at: datetime
    pushed_at: datetime
    stars: int


class AdminProjectOut(BaseModel):
    id: int
    title: str
    context: ProjectContext | None
    team_size: int | None
    visible: bool
    missing: bool
    about_lang: str | None
    summary: dict[str, str]  # every language; "" until the "About" is translated
    github: GitHubOut
    image_url: str | None
    image_focus: PhotoFocus

    @classmethod
    def from_domain(cls, project: Project) -> "AdminProjectOut":
        assert project.id is not None  # stored projects always have one
        repository = project.repository
        return cls(
            id=project.id,
            title=project.title,
            context=project.context,
            team_size=project.team_size,
            visible=project.visible,
            missing=project.missing,
            about_lang=project.about_lang,
            summary=with_every_lang(project.summary),
            github=GitHubOut(
                id=repository.github_id,
                name=repository.name,
                url=repository.url,
                homepage=repository.homepage,
                about=repository.about,
                languages=repository.languages,
                topics=list(repository.topics),
                created_at=repository.created_at,
                pushed_at=repository.pushed_at,
                stars=repository.stars,
            ),
            image_url=image_url("projects", str(project.id)),
            image_focus=PhotoFocus(x=project.image_focus_x, y=project.image_focus_y),
        )


class SyncOut(BaseModel):
    new: int
    updated: int
    missing: int
    translation_failed: bool


def _not_found() -> HTTPException:
    return HTTPException(status.HTTP_404_NOT_FOUND, detail="Project not found")


@router.get("/projects")
async def list_projects(repository: Repository) -> list[AdminProjectOut]:
    return [AdminProjectOut.from_domain(project) for project in await repository.list()]


@router.get("/projects/{project_id}")
async def get_project(project_id: int, repository: Repository) -> AdminProjectOut:
    project = await repository.get(project_id)
    if project is None:
        raise _not_found()
    return AdminProjectOut.from_domain(project)


@router.put("/projects/{project_id}")
async def update_project(
    project_id: int, body: ProjectDetailsIn, repository: Repository
) -> AdminProjectOut:
    project = await repository.get(project_id)
    if project is None:
        raise _not_found()
    if body.visible and project.missing:
        # Its GitHub link would be broken: it comes back when the repository is public again.
        raise HTTPException(status.HTTP_409_CONFLICT, detail="This project is not on GitHub")
    updated = replace(project, **body.model_dump(exclude={"image_focus"}))
    if body.image_focus is not None:
        focus = body.image_focus
        updated = replace(updated, image_focus_x=focus.x, image_focus_y=focus.y)
    await repository.save_details(updated)
    await repository.commit()
    return AdminProjectOut.from_domain(updated)


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(project_id: int, repository: Repository) -> None:
    if not await repository.delete(project_id):
        raise _not_found()
    await repository.commit()
    delete_image("projects", str(project_id))  # after the commit: a failed delete keeps it


@router.post("/projects/{project_id}/move", status_code=status.HTTP_204_NO_CONTENT)
async def move_project(project_id: int, body: MoveIn, repository: Repository) -> None:
    if not await repository.move(project_id, body.direction):
        raise _not_found()
    await repository.commit()


@router.post("/projects/sync")
async def sync_with_github(
    repository: Repository,
    github: Annotated[GitHubClient, Depends(get_github_client)],
    translator: Annotated[Translator, Depends(get_translator)],
) -> SyncOut:
    """Import or refresh the public repositories; GitHub is called only here."""
    try:
        report = await sync_projects(repository, github, translator)
    except GitHubUnavailable as error:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(error)) from error
    return SyncOut(**report.__dict__)

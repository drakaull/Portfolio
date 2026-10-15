from typing import Literal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.project import GitHubRepository, Project
from app.infra.models import ProjectModel


def _to_domain(row: ProjectModel) -> Project:
    return Project(
        id=row.id,
        repository=GitHubRepository(
            github_id=row.github_id,
            name=row.name,
            url=row.url,
            homepage=row.homepage,
            about=row.about,
            languages=dict(row.languages),
            topics=tuple(row.topics),
            created_at=row.github_created_at,
            pushed_at=row.pushed_at,
            stars=row.stars,
        ),
        about_lang=row.about_lang,
        summary=dict(row.summary),
        title=row.title,
        context=row.context,
        team_size=row.team_size,
        visible=row.visible,
        missing=row.missing,
    )


def _copy_github(project: Project, row: ProjectModel) -> None:
    repository = project.repository
    row.github_id = repository.github_id
    row.name = repository.name
    row.url = repository.url
    row.homepage = repository.homepage
    row.about = repository.about
    row.languages = dict(repository.languages)
    row.topics = list(repository.topics)
    row.github_created_at = repository.created_at
    row.pushed_at = repository.pushed_at
    row.stars = repository.stars
    row.about_lang = project.about_lang
    row.summary = dict(project.summary)
    row.missing = project.missing


def _copy_details(project: Project, row: ProjectModel) -> None:
    row.title = project.title
    row.context = project.context
    row.team_size = project.team_size
    row.visible = project.visible


class ProjectRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list(self) -> list[Project]:
        """Every project, in the admin's order."""
        rows = await self._session.scalars(select(ProjectModel).order_by(ProjectModel.position))
        return [_to_domain(row) for row in rows]

    async def get(self, project_id: int) -> Project | None:
        row = await self._session.get(ProjectModel, project_id)
        return None if row is None else _to_domain(row)

    async def add(self, project: Project) -> Project:
        """Store a newly synced project last; returns it with its id."""
        last = await self._session.scalar(select(func.max(ProjectModel.position)))
        row = ProjectModel(position=0 if last is None else last + 1)
        _copy_github(project, row)
        _copy_details(project, row)
        self._session.add(row)
        await self._session.flush()
        return _to_domain(row)

    async def save_github(self, project: Project) -> None:
        """Refresh what comes from GitHub (and the missing mark); the admin's fields are kept,
        except that a missing project is hidden."""
        row = await self._row(project)
        _copy_github(project, row)
        if project.missing:
            row.visible = False
        await self._session.flush()

    async def save_details(self, project: Project) -> None:
        """Save what the admin edits: title, context, team size, visibility."""
        row = await self._row(project)
        _copy_details(project, row)
        await self._session.flush()

    async def delete(self, project_id: int) -> bool:
        """Delete the project; False when there was none."""
        row = await self._session.get(ProjectModel, project_id)
        if row is None:
            return False
        await self._session.delete(row)
        await self._session.flush()
        return True

    async def move(self, project_id: int, direction: Literal["up", "down"]) -> bool:
        """Swap the project with its neighbour; False when the project is unknown.

        At either end there is no neighbour, and nothing changes.
        """
        row = await self._session.get(ProjectModel, project_id)
        if row is None:
            return False
        query = select(ProjectModel)
        neighbour = await self._session.scalar(
            query.where(ProjectModel.position < row.position)
            .order_by(ProjectModel.position.desc())
            .limit(1)
            if direction == "up"
            else query.where(ProjectModel.position > row.position)
            .order_by(ProjectModel.position)
            .limit(1)
        )
        if neighbour is not None:
            row.position, neighbour.position = neighbour.position, row.position
            await self._session.flush()
        return True

    async def commit(self) -> None:
        await self._session.commit()

    async def _row(self, project: Project) -> ProjectModel:
        row = await self._session.get(ProjectModel, project.id)
        if row is None:
            raise LookupError(f"Unknown project {project.id}")
        return row

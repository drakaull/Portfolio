import logging
from dataclasses import dataclass, replace
from typing import get_args

from app.domain.language import Lang
from app.domain.project import Project, title_from_name
from app.infra.github import GitHubClient
from app.infra.repositories.project import ProjectRepository
from app.infra.translation import TranslationUnavailable, Translator

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class SyncReport:
    new: int
    updated: int
    missing: int  # newly gone from GitHub at this sync
    translation_failed: bool


async def translate_about(
    about: str | None, translator: Translator
) -> tuple[str | None, dict[str, str]]:
    """The "About" in every site language, and the language it was written in.

    Without an "About" there is nothing to show. If DeepL fails, nothing is stored: the public
    site shows the original meanwhile, and the next sync tries again.
    """
    if not about:
        return None, {}
    languages: tuple[Lang, ...] = get_args(Lang)
    # Translating to French first also tells which language the "About" is written in.
    french, source = await translator.translate_detecting(about, "fr")
    summary = {"fr": about if source == "fr" else french}
    for target in languages:
        if target == "fr":
            continue
        summary[target] = (
            about if target == source else (await translator.translate_detecting(about, target))[0]
        )
    return source, summary


async def sync_projects(
    repository: ProjectRepository, github: GitHubClient, translator: Translator
) -> SyncReport:
    """Import or refresh the public repositories as projects; commits once at the end.

    GitHub is read before anything is written, so a GitHub failure changes nothing. The admin's
    fields are never touched, except that a project gone from GitHub is hidden.
    """
    repositories = await github.public_repositories()
    known = {project.repository.github_id: project for project in await repository.list()}
    new = updated = missing = 0
    translation_failed = False

    for repo in repositories:
        current = known.pop(repo.github_id, None)
        # Translate only a new or changed "About", or one whose translation failed before.
        if current and current.repository.about == repo.about and current.about_lang:
            about_lang, summary = current.about_lang, current.summary
        else:
            try:
                about_lang, summary = await translate_about(repo.about, translator)
            except TranslationUnavailable as error:
                logger.warning("Could not translate the About of %s: %s", repo.name, error)
                about_lang, summary, translation_failed = None, {}, True

        if current is None:
            await repository.add(
                Project(
                    id=None,
                    repository=repo,
                    about_lang=about_lang,
                    summary=summary,
                    title=title_from_name(repo.name),
                    context=None,
                    team_size=None,
                    visible=False,  # nothing goes public without the admin
                    missing=False,
                )
            )
            new += 1
        else:
            await repository.save_github(
                replace(
                    current, repository=repo, about_lang=about_lang, summary=summary, missing=False
                )
            )
            updated += 1

    for gone in known.values():
        if not gone.missing:
            await repository.save_github(replace(gone, missing=True))
            missing += 1

    await repository.commit()
    return SyncReport(new, updated, missing, translation_failed)

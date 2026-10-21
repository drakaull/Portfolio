"""Admin uploads of the site's other images: experience logos, project screenshots, contact image.

Each upload applies at once (like the photo and the CV) and is cleaned by the photo pipeline.
"""

from dataclasses import replace
from typing import Annotated

from fastapi import Depends, HTTPException, UploadFile, status

from app.api.admin_experiences import Slug
from app.api.dependencies import (
    admin_router,
    get_experience_repository,
    get_home_repository,
    get_project_repository,
)
from app.domain.home import PHOTO_FOCUS_CENTRE
from app.infra.repositories.experience import ExperienceRepository
from app.infra.repositories.home import HomeContentRepository
from app.infra.repositories.project import ProjectRepository
from app.infra.storage import (
    ImageKind,
    NotAnImageError,
    PhotoTooLargeError,
    delete_image,
    save_image,
)

router = admin_router()

Experiences = Annotated[ExperienceRepository, Depends(get_experience_repository)]
Projects = Annotated[ProjectRepository, Depends(get_project_repository)]
Home = Annotated[HomeContentRepository, Depends(get_home_repository)]

# The contact page has a single image.
CONTACT_KEY = "page"


async def _store(kind: ImageKind, key: str, file: UploadFile) -> None:
    # The declared type is not trusted: the content is checked while processing.
    try:
        await save_image(kind, key, file.read)
    except NotAnImageError as error:
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="The image must be a JPEG, PNG or WebP"
        ) from error
    except PhotoTooLargeError as error:
        raise HTTPException(
            status.HTTP_413_CONTENT_TOO_LARGE, detail="The image must be 5 MB and 40 Mpx or less"
        ) from error


def _not_found() -> HTTPException:
    return HTTPException(status.HTTP_404_NOT_FOUND, detail="Not found")


@router.put("/experiences/{slug}/logo", status_code=status.HTTP_204_NO_CONTENT)
async def upload_logo(slug: Slug, file: UploadFile, experiences: Experiences) -> None:
    if await experiences.get(slug) is None:
        raise _not_found()
    await _store("logos", slug, file)


@router.delete("/experiences/{slug}/logo", status_code=status.HTTP_204_NO_CONTENT)
async def remove_logo(slug: Slug, experiences: Experiences) -> None:
    if await experiences.get(slug) is None:
        raise _not_found()
    delete_image("logos", slug)


@router.put("/projects/{project_id}/image", status_code=status.HTTP_204_NO_CONTENT)
async def upload_screenshot(project_id: int, file: UploadFile, projects: Projects) -> None:
    project = await projects.get(project_id)
    if project is None:
        raise _not_found()
    await _store("projects", str(project_id), file)
    # A new screenshot has its own subject: its framing starts from the centre.
    centred = replace(project, image_focus_x=PHOTO_FOCUS_CENTRE, image_focus_y=PHOTO_FOCUS_CENTRE)
    await projects.save_details(centred)
    await projects.commit()


@router.delete("/projects/{project_id}/image", status_code=status.HTTP_204_NO_CONTENT)
async def remove_screenshot(project_id: int, projects: Projects) -> None:
    if await projects.get(project_id) is None:
        raise _not_found()
    delete_image("projects", str(project_id))


@router.put("/contact-image", status_code=status.HTTP_204_NO_CONTENT)
async def upload_contact_image(file: UploadFile, home: Home) -> None:
    await _store("contact", CONTACT_KEY, file)
    content = await home.get()
    if content is not None:
        await home.save(
            replace(content, contact_focus_x=PHOTO_FOCUS_CENTRE, contact_focus_y=PHOTO_FOCUS_CENTRE)
        )
        await home.commit()


@router.delete("/contact-image", status_code=status.HTTP_204_NO_CONTENT)
async def remove_contact_image() -> None:
    delete_image("contact", CONTACT_KEY)

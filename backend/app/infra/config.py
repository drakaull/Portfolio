from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings, read from environment variables or the `.env` file."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    debug: bool = False
    database_url: str
    # Uploaded files (CV, later images). Git-ignored; must be a persistent volume in production.
    storage_dir: Path = Path("storage")
    # DeepL API key for automatic translation; without it, translation is reported as unavailable.
    deepl_api_key: str | None = None
    # GitHub account whose public repositories become the projects.
    github_username: str = "drakaull"
    # Contact form: where messages are emailed (never shown on the site) and how. The defaults
    # point at Mailpit from docker-compose.yml, which catches every email locally.
    contact_email: str | None = None
    smtp_host: str = "localhost"
    smtp_port: int = 1025
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_from: str = "portfolio@localhost"
    smtp_starttls: bool = False


settings = Settings()

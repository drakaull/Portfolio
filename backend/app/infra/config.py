from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings, read from environment variables or the `.env` file."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    debug: bool = False
    database_url: str
    # Uploaded files (CV, later images). Git-ignored; must be a persistent volume in production.
    storage_dir: Path = Path("storage")


settings = Settings()

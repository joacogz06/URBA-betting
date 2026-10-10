from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./urba_betting.db"
    debug: bool = True
    secret_key: str = "dev-secret-key"

    urba_api_base: str = "https://api.urba.org.ar"
    urba_championship_id: str = "2025176"
    urba_season_id: str = "2026"

    class Config:
        env_file = ".env"


settings = Settings()
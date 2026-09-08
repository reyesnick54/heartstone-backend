import asyncio
from contextlib import asynccontextmanager

import asyncpg
import redis.asyncio as redis
from fastapi import FastAPI, Response, status

from app.config import Settings, get_settings


async def check_postgres(settings: Settings) -> None:
    conn = await asyncpg.connect(settings.database_url, timeout=2)
    try:
        await conn.execute("SELECT 1")
    finally:
        await conn.close()


async def check_redis(settings: Settings) -> None:
    client = redis.from_url(settings.redis_url, decode_responses=True)
    try:
        if not await client.ping():
            raise RuntimeError("Redis ping failed")
    finally:
        await client.aclose()


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        lifespan=lifespan,
    )

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/ready")
    async def ready(response: Response) -> dict[str, str]:
        try:
            await asyncio.gather(
                check_postgres(settings),
                check_redis(settings),
            )
        except Exception as exc:
            response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
            return {"status": "not_ready", "detail": str(exc)}
        return {"status": "ready"}

    @app.get("/version")
    async def version() -> dict[str, str]:
        return {"name": settings.app_name, "version": settings.app_version}

    return app


app = create_app()

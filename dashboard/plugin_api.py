"""AEGIS backend — one snapshot endpoint for Mission Control.

Mounted by Hermes at ``/api/plugins/aegis/`` (only once the plugin is enabled).
The desktop app can reach a plugin only through its own namespace, so this
gathers what Mission Control shows into one read-only call: status, model and
context window, host stats, recent sessions, profiles, today's usage and the
kanban board.

It reuses the dashboard's own route functions rather than re-implementing any
query, and every source is independent: a failure (older Hermes, kanban off)
returns ``null`` for that key and never fails the request.
"""

from __future__ import annotations

import asyncio
import inspect
import logging
from contextlib import closing
from typing import Any, Awaitable, Callable

from fastapi import APIRouter

log = logging.getLogger(__name__)
router = APIRouter()


async def _call(fn: Callable[..., Any], **kwargs: Any) -> Any:
    """Call a sync or async route function off the event loop; unwrap awaitables."""
    if inspect.iscoroutinefunction(fn):
        return await fn(**kwargs)
    result = await asyncio.to_thread(fn, **kwargs)
    return await result if inspect.isawaitable(result) else result


async def _safe(name: str, load: Callable[[], Awaitable[Any]]) -> Any:
    try:
        return await load()
    except Exception as exc:  # one source failing must not blank the room
        log.debug("aegis snapshot: %s unavailable: %s", name, exc)
        return None


async def _status() -> Any:
    from hermes_cli.web_routers.status import get_status
    return await _call(get_status, profile=None)


async def _system() -> Any:
    from hermes_cli.web_routers.status import get_system_stats
    return await _call(get_system_stats)


async def _model() -> Any:
    from hermes_cli.web_routers.models import get_model_info
    return await _call(get_model_info, profile=None)


async def _sessions() -> Any:
    from hermes_cli.web_routers.sessions import get_sessions
    # Route defaults are FastAPI Query objects, so every parameter is passed explicitly.
    page = await _call(
        get_sessions, limit=25, offset=0, min_messages=0, archived="exclude", order="recent",
        source=None, sources=None, exclude_sources=None, cwd_prefix=None, full=False, profile=None)
    return page.get("sessions") if isinstance(page, dict) else None


async def _profiles() -> Any:
    from hermes_cli.web_routers.profiles import _read_profiles
    result = await _call(_read_profiles)
    return result.get("profiles") if isinstance(result, dict) else None


async def _analytics() -> Any:
    from hermes_cli.web_routers.analytics import get_usage_analytics
    result = await _call(get_usage_analytics, days=1, profile=None)
    return result.get("totals") if isinstance(result, dict) else None


def _board_sync() -> list[dict[str, Any]]:
    from hermes_cli import kanban_db
    from hermes_cli.kanban_db_connect import connect
    with closing(connect(board=kanban_db.get_current_board())) as conn:
        tasks = kanban_db.list_tasks(conn, limit=300)
    return [{
        "id": t.id, "title": t.title, "assignee": t.assignee, "status": t.status,
        "created_at": t.created_at, "started_at": t.started_at, "completed_at": t.completed_at,
        "consecutive_failures": getattr(t, "consecutive_failures", 0),
    } for t in tasks if t.status != "archived"]


async def _board() -> Any:
    return await asyncio.to_thread(_board_sync)


@router.get("/snapshot")
async def snapshot() -> dict[str, Any]:
    names = ("status", "system", "model", "sessions", "profiles", "analytics", "tasks")
    loaders = (_status, _system, _model, _sessions, _profiles, _analytics, _board)
    values = await asyncio.gather(*(_safe(n, f) for n, f in zip(names, loaders)))
    return dict(zip(names, values))

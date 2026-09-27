"""AEGIS for Hermes — dashboard and desktop surfaces only.

Everything this plugin does lives in ``dashboard/`` (Mission Control, boot
screen, HUD, and a read-only ``plugin_api.py`` snapshot endpoint) and
``desktop/plugin.js`` (the same for Hermes Desktop, plus its themes). This
module exists so ``hermes plugins enable aegis`` can find the plugin; it
deliberately registers no tools, hooks, middleware or commands, so it adds
nothing to the agent's prompt or tool schema.
"""


def register(ctx) -> None:  # noqa: ARG001 - required entry point, intentionally empty
    return None

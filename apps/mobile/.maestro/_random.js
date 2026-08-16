// Random suffix for unique entity names. The local database persists across
// flow runs, so a fixed name (e.g. "Такси") would hit the unique-name guard
// on the suite's second run. Overridable via MAESTRO_NAME_SUFFIX for
// reproducible runs.
output.suffix = MAESTRO_NAME_SUFFIX || Math.random().toString(36).slice(2, 8)

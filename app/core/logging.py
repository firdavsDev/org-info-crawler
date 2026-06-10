"""Structured JSON logging with rotating file output.

Two handlers are configured:
  - stderr  : plain text for Docker's stdout log driver
  - file     : JSON, rotating at 5 MB, keeping 3 backups → /app/logs/app.json.log
"""
import json
import logging
import logging.handlers
import os



class _JsonFormatter(logging.Formatter):
    """Emit one JSON object per log record."""

    def format(self, record: logging.LogRecord) -> str:  # noqa: A003
        payload: dict = {
            "ts": self.formatTime(record, "%Y-%m-%dT%H:%M:%S"),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        # Carry any extra fields passed via logging.info("…", extra={…})
        for key, val in record.__dict__.items():
            if key not in logging.LogRecord.__dict__ and not key.startswith("_"):
                payload[key] = val
        return json.dumps(payload, ensure_ascii=False, default=str)


def configure_logging(log_dir: str = "/app/logs") -> None:
    """Call once at application startup."""
    os.makedirs(log_dir, exist_ok=True)

    root = logging.getLogger()
    root.setLevel(logging.INFO)

    # --- stderr handler (plain text, picked up by Docker logs) ---
    stderr_handler = logging.StreamHandler()
    stderr_handler.setFormatter(
        logging.Formatter("%(levelname)s %(name)s %(message)s")
    )

    # --- rotating JSON file handler ---
    log_file = os.path.join(log_dir, "app.json.log")
    file_handler = logging.handlers.RotatingFileHandler(
        log_file,
        maxBytes=5 * 1024 * 1024,   # 5 MB
        backupCount=3,
        encoding="utf-8",
    )
    file_handler.setFormatter(_JsonFormatter())

    root.handlers.clear()
    root.addHandler(stderr_handler)
    root.addHandler(file_handler)

    # Silence noisy third-party loggers
    logging.getLogger("scrapy").setLevel(logging.WARNING)
    logging.getLogger("twisted").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)

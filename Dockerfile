FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY crawler ./crawler
COPY worker ./worker
COPY alembic ./alembic

# Create the log directory and ensure the non-root process can write to it.
# The container runs as root by default (python:slim), but we create the dir
# explicitly so a mounted host volume inherits the right path.
RUN mkdir -p /app/logs && chmod 777 /app/logs

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

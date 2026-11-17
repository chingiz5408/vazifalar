FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN useradd --uid 10001 --create-home --shell /usr/sbin/nologin runner

WORKDIR /app
COPY --chown=10001:10001 worker.py /app/worker.py

USER 10001:10001

CMD ["python", "-I", "-S", "/app/worker.py"]
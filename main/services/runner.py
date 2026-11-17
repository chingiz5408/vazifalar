"""Code Runner servisi bilan HTTP orqali ishlash.

Bu qatlam Django'dan mustaqil: faqat so'rov yuboradi va natijani
oddiy lug'at ko'rinishida qaytaradi.
"""

import time

import requests
from django.conf import settings

RUNNER_BASE_URL = settings.CODE_RUNNER_BASE_URL.rstrip("/")
RUNNER_CREATE_URL = f"{RUNNER_BASE_URL}/tasks"
RUNNER_RESULT_URL = f"{RUNNER_BASE_URL}/tasks/{{}}"
RUNNER_HTTP_TIMEOUT = settings.CODE_RUNNER_HTTP_TIMEOUT
RUNNER_MAX_WAIT = settings.CODE_RUNNER_MAX_WAIT
RUNNER_POLL_INTERVAL = settings.CODE_RUNNER_POLL_INTERVAL


class RunnerError(Exception):
    """Code Runner bilan bog'liq xatolar."""


def run_in_runner(code, stdin_data=""):
    """Kodni Code Runner'da bir marta bajaradi va natijani qaytaradi."""
    response = requests.post(
        RUNNER_CREATE_URL,
        json={"code": code, "stdin": stdin_data},
        timeout=RUNNER_HTTP_TIMEOUT,
    )
    response.raise_for_status()

    task_id = response.json().get("task_id")
    if not task_id:
        raise RunnerError("Code Runner task_id qaytarmadi.")

    deadline = time.monotonic() + RUNNER_MAX_WAIT
    data = {}
    while time.monotonic() < deadline:
        result_response = requests.get(
            RUNNER_RESULT_URL.format(task_id),
            timeout=RUNNER_HTTP_TIMEOUT,
        )
        result_response.raise_for_status()
        data = result_response.json()

        if data.get("status") not in ("queued", "running"):
            break
        time.sleep(RUNNER_POLL_INTERVAL)
    else:
        raise RunnerError("Dastur bajarilish vaqtidan oshdi.")

    completed = data.get("status") == "completed"
    result = data.get("result") or {}

    stderr = result.get("stderr") or result.get("error") or ""
    if not completed and not stderr:
        stderr = "Dastur bajarilmadi."

    return {
        "stdout": result.get("stdout", ""),
        "stderr": stderr,
        "returncode": result.get("returncode") if completed else -1,
        "timed_out": bool(result.get("timed_out", False)),
        "time_seconds": result.get("time_seconds"),
    }

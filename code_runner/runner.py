
import json
import subprocess
import time

IMAGE = "sputnik-python:3.12"


def run_code(code: str, stdin_data: str = "", timeout: int = 5):
    request_data = json.dumps({
        "code": code,
        "stdin": stdin_data,
    }) + "\n"

    command = [
        "docker", "run", "--rm", "-i",
        "--network", "none",
        "--memory", "128m",
        "--cpus", "0.5",
        "--pids-limit", "32",
        "--read-only",
        "--tmpfs", "/tmp:rw,noexec,nosuid,size=16m",
        "--cap-drop=ALL",
        "--security-opt=no-new-privileges",
        "--user=10001:10001",
        IMAGE,
    ]

    start = time.perf_counter()

    try:
        result = subprocess.run(
            command,
            input=request_data.encode("utf-8"),
            capture_output=True,
            timeout=timeout,
        )

        elapsed = round(time.perf_counter() - start, 3)

        if result.returncode != 0:
            return {
                "error": result.stderr.decode("utf-8", errors="replace")[:2000],
                "time_seconds": elapsed,
            }

        response = json.loads(result.stdout.decode("utf-8").strip())
        response["time_seconds"] = elapsed
        return response

    except subprocess.TimeoutExpired:
        return {
            "error": "Bajarilish vaqti limitidan oshdi.",
            "timed_out": True,
            "time_seconds": round(time.perf_counter() - start, 3),
        }


if __name__ == "__main__":
    result = run_code(
        code='name = input(); print(f"Salom, {name}!"); print(10 * 5)',
        stdin_data="Chingiz\n",
    )
    print(result)

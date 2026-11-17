import json
import subprocess
import sys

MAX_CODE_SIZE = 50_000
MAX_INPUT_SIZE = 10_000
TIMEOUT_SECONDS = 3
MAX_OUTPUT_SIZE = 10_000

def execute(request):
    code = request.get("code", "")
    stdin_data = request.get("stdin", "")

    if not isinstance(code, str) or not isinstance(stdin_data, str):
        return {"error": "code va stdin matn bo‘lishi kerak"}

    if len(code.encode("utf-8")) > MAX_CODE_SIZE:
        return {"error": "Kod hajmi juda katta"}

    if len(stdin_data.encode("utf-8")) > MAX_INPUT_SIZE:
        return {"error": "Kiritilgan ma’lumot hajmi juda katta"}

    try:
        result = subprocess.run(
            [sys.executable, "-I", "-S", "-c", code],
            input=stdin_data.encode("utf-8"),
            capture_output=True,
            timeout=TIMEOUT_SECONDS,
        )

        return {
            "stdout": result.stdout[:MAX_OUTPUT_SIZE].decode(
                "utf-8", errors="replace"
            ),
            "stderr": result.stderr[:MAX_OUTPUT_SIZE].decode(
                "utf-8", errors="replace"
            ),
            "returncode": result.returncode,
            "timed_out": False,
        }

    except subprocess.TimeoutExpired:
        return {
            "stdout": "",
            "stderr": "Dastur bajarilish vaqti limitidan oshdi.",
            "returncode": None,
            "timed_out": True,
        }


for line in sys.stdin:
    try:
        request = json.loads(line)
        response = execute(request)
    except Exception:
        response = {"error": "So‘rovni qayta ishlashda xatolik"}

    print(json.dumps(response, ensure_ascii=False), flush=True)
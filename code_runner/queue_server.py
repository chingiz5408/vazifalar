
import json
import queue
import threading
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

from pool import ContainerPool, POOL_SIZE

HOST = "127.0.0.1"
PORT = 8765

# Bir vaqtda bajariladigan vazifalar soni.
WORKER_COUNT = 3

# Navbatda ko‘pi bilan 100 ta vazifa kutadi.
MAX_QUEUE_SIZE = 100

task_queue = queue.Queue(maxsize=MAX_QUEUE_SIZE)
tasks = {}
tasks_lock = threading.Lock()

pool = ContainerPool(size=POOL_SIZE)


def update_task(task_id, **changes):
    with tasks_lock:
        if task_id in tasks:
            tasks[task_id].update(changes)


def execute_tasks(worker_number):
    """Har bir worker navbatdan bittadan vazifa oladi."""

    while True:
        task_id = task_queue.get()

        try:
            with tasks_lock:
                task = tasks.get(task_id)

            if task is None:
                continue

            update_task(
                task_id,
                status="running",
                started_at=__import__("time").time(),
                worker=worker_number,
            )

            try:
                result = pool.run_code(
                    task["code"],
                    task["stdin"],
                )

                if result.get("timed_out"):
                    status = "timeout"
                elif result.get("error"):
                    status = "failed"
                else:
                    status = "completed"

                update_task(
                    task_id,
                    status=status,
                    result=result,
                    finished_at=__import__("time").time(),
                )

            except Exception as exc:
                update_task(
                    task_id,
                    status="failed",
                    result={"error": str(exc)},
                    finished_at=__import__("time").time(),
                )

        finally:
            task_queue.task_done()


class Handler(BaseHTTPRequestHandler):

    def send_json(self, status_code, data):
        body = json.dumps(
            data,
            ensure_ascii=False,
        ).encode("utf-8")

        self.send_response(status_code)
        self.send_header(
            "Content-Type",
            "application/json; charset=utf-8",
        )
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if urlparse(self.path).path != "/tasks":
            self.send_json(404, {"error": "Endpoint topilmadi"})
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))

            if length <= 0 or length > 65_536:
                self.send_json(413, {"error": "So‘rov hajmi noto‘g‘ri"})
                return

            data = json.loads(self.rfile.read(length))

            if not isinstance(data, dict):
                self.send_json(400, {"error": "JSON obyekt yuboring"})
                return

            code = data.get("code", "")
            stdin_data = data.get("stdin", "")

            if not isinstance(code, str) or not isinstance(stdin_data, str):
                self.send_json(400, {
                    "error": "code va stdin matn bo‘lishi kerak"
                })
                return

            if not code.strip():
                self.send_json(400, {"error": "Python kodi bo‘sh"})
                return

            if len(code.encode("utf-8")) > 50_000:
                self.send_json(413, {"error": "Kod hajmi 50 KB dan katta"})
                return

            if len(stdin_data.encode("utf-8")) > 10_000:
                self.send_json(413, {"error": "stdin hajmi juda katta"})
                return

            task_id = uuid.uuid4().hex

            task = {
                "task_id": task_id,
                "status": "queued",
                "code": code,
                "stdin": stdin_data,
                "created_at": __import__("time").time(),
            }

            with tasks_lock:
                tasks[task_id] = task

            try:
                task_queue.put_nowait(task_id)
            except queue.Full:
                with tasks_lock:
                    tasks.pop(task_id, None)

                self.send_json(429, {
                    "error": "Navbat to‘la. Keyinroq qayta urinib ko‘ring."
                })
                return

            self.send_json(202, {
                "task_id": task_id,
                "status": "queued",
                "status_url": f"/tasks/{task_id}",
            })

        except (ValueError, json.JSONDecodeError):
            self.send_json(400, {"error": "Noto‘g‘ri JSON"})

    def do_GET(self):
        path = urlparse(self.path).path

        if path == "/health":
            with tasks_lock:
                running = sum(
                    1 for task in tasks.values()
                    if task["status"] == "running"
                )

            self.send_json(200, {
                "status": "ok",
                "queued_tasks": task_queue.qsize(),
                "running_tasks": running,
                "workers": WORKER_COUNT,
                "ready_containers": pool.available.qsize(),
            })
            return

        prefix = "/tasks/"

        if path.startswith(prefix):
            task_id = path[len(prefix):]

            with tasks_lock:
                task = tasks.get(task_id)
                snapshot = dict(task) if task else None

            if snapshot is None:
                self.send_json(404, {"error": "Vazifa topilmadi"})
                return

            # Kod va stdin ni mijozga qaytarmaymiz.
            snapshot.pop("code", None)
            snapshot.pop("stdin", None)

            self.send_json(200, snapshot)
            return

        self.send_json(404, {"error": "Endpoint topilmadi"})

    def log_message(self, fmt, *args):
        print("[HTTP]", fmt % args)


if __name__ == "__main__":
    pool.start()

    for number in range(1, WORKER_COUNT + 1):
        threading.Thread(
            target=execute_tasks,
            args=(number,),
            daemon=True,
            name=f"queue-worker-{number}",
        ).start()

    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"[QUEUE] API: http://{HOST}:{PORT}")
    print(f"[QUEUE] Workerlar: {WORKER_COUNT}")
    print(f"[QUEUE] Maksimal navbat: {MAX_QUEUE_SIZE}")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[QUEUE] Server to‘xtatilmoqda...")
    finally:
        server.server_close()

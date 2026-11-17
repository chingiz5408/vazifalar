
import json
import queue
import subprocess
import threading
import time
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

IMAGE = "sputnik-python:3.12"
POOL_SIZE = 3
HOST = "127.0.0.1"
PORT = 8765


class ContainerPool:
    def __init__(self, size=POOL_SIZE):
        self.size = size
        self.available = queue.Queue(maxsize=size)
        self.lock = threading.Lock()
        self.refilling = 0
        self.active = {}

    def create_container(self):
        name = f"sputnik-pool-{uuid.uuid4().hex[:12]}"

        command = [
            "docker", "run",
            "--rm",
            "--name", name,
            "-i",
            "--network", "none",
            "--memory=128m",
            "--cpus=0.5",
            "--pids-limit=32",
            "--read-only",
            "--tmpfs", "/tmp:rw,noexec,nosuid,size=16m",
            "--cap-drop=ALL",
            "--security-opt=no-new-privileges",
            "--init",
            IMAGE,
        ]

        proc = subprocess.Popen(
            command,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )

        # Docker konteyneri ishga tushmagan bo'lsa,
        # uni tayyor konteyner sifatida navbatga qo'shmaymiz.
        time.sleep(0.15)

        if proc.poll() is not None:
            _, stderr = proc.communicate()
            raise RuntimeError(
                stderr.decode("utf-8", errors="replace")[:2000]
            )

        with self.lock:
            self.active[name] = proc

        print(f"[POOL] Tayyorlanmoqda: {name}")
        return name, proc

    def start(self):
        print(f"[POOL] {self.size} ta konteyner tayyorlanmoqda...")

        for _ in range(self.size):
            self.available.put(self.create_container())

        print("[POOL] Ishga tayyor.")

    def refill(self):
        with self.lock:
            needed = (
                self.size
                - self.available.qsize()
                - self.refilling
            )

            if needed <= 0:
                return

            self.refilling += needed

        threading.Thread(
            target=self._create_replacements,
            args=(needed,),
            daemon=True,
        ).start()

    def _create_replacements(self, count):
        for _ in range(count):
            try:
                container = self.create_container()
                self.available.put(container)
            except Exception as exc:
                print(f"[POOL] Konteyner yaratilmadi: {exc}")
            finally:
                with self.lock:
                    self.refilling -= 1

    def run_code(self, code, stdin_data=""):
        if not isinstance(code, str) or not isinstance(stdin_data, str):
            return {"error": "code va stdin matn bo‘lishi kerak"}

        if len(code.encode("utf-8")) > 50_000:
            return {"error": "Kod hajmi 50 KB dan oshmasligi kerak"}

        if len(stdin_data.encode("utf-8")) > 10_000:
            return {"error": "Kiritilgan ma'lumot juda katta"}

        # Tayyor konteyner qolmagan bo'lsa, yangilarini yaratishni boshlaymiz.
        self.refill()

        try:
            name, proc = self.available.get(timeout=60)
        except queue.Empty:
            return {"error": "Hozircha bo‘sh konteyner yo‘q"}

        # Olingan konteyner o'rniga yangisini fonda tayyorlaymiz.
        self.refill()

        request = json.dumps({
            "code": code,
            "stdin": stdin_data,
        }) + "\n"

        start = time.perf_counter()

        try:
            stdout, stderr = proc.communicate(
                input=request.encode("utf-8"),
                timeout=6,
            )

            elapsed = round(time.perf_counter() - start, 3)

            if proc.returncode != 0:
                return {
                    "error": stderr.decode(
                        "utf-8", errors="replace"
                    )[:2000],
                    "time_seconds": elapsed,
                }

            output = stdout.decode(
                "utf-8", errors="replace"
            ).strip()

            if len(output) > 20_000:
                return {"error": "Worker javobi juda katta"}

            response = json.loads(output)
            response["time_seconds"] = elapsed
            return response

        except subprocess.TimeoutExpired:
            elapsed = round(time.perf_counter() - start, 3)

            print(
                f"[POOL][TIMEOUT] container={name} "
                f"elapsed={elapsed}s "
                f"proc_pid={proc.pid} "
                f"proc_poll={proc.poll()}",
                flush=True,
            )

            proc.kill()
            proc.communicate()

            return {
                "error": "Bajarilish vaqti limitidan oshdi",
                "timed_out": True,
                "time_seconds": elapsed,
            }

        except (json.JSONDecodeError, OSError) as exc:
            return {"error": f"Runner xatosi: {exc}"}

        finally:
            # Ishlatilgan konteynerni va uning jarayonini tozalaymiz.
            with self.lock:
                self.active.pop(name, None)

            try:
                subprocess.run(
                    ["docker", "rm", "-f", name],
                    capture_output=True,
                    timeout=5,
                )
            except (subprocess.TimeoutExpired, OSError):
                pass


POOL = ContainerPool()


class Handler(BaseHTTPRequestHandler):
    def send_json(self, status, data):
        body = json.dumps(
            data, ensure_ascii=False
        ).encode("utf-8")

        self.send_response(status)
        self.send_header(
            "Content-Type", "application/json; charset=utf-8"
        )
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/health":
            self.send_json(200, {
                "status": "ok",
                "ready_containers": POOL.available.qsize(),
                "target_containers": POOL.size,
            })
        else:
            self.send_json(404, {"error": "Endpoint topilmadi"})

    def do_POST(self):
        if self.path != "/run":
            self.send_json(404, {"error": "Endpoint topilmadi"})
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))

            if length <= 0 or length > 65_536:
                self.send_json(413, {
                    "error": "So‘rov hajmi noto‘g‘ri"
                })
                return

            data = json.loads(self.rfile.read(length))

            if not isinstance(data, dict):
                self.send_json(400, {
                    "error": "JSON obyekt bo‘lishi kerak"
                })
                return

            result = POOL.run_code(
                data.get("code", ""),
                data.get("stdin", ""),
            )

            self.send_json(200, result)

        except (ValueError, json.JSONDecodeError):
            self.send_json(400, {"error": "Noto‘g‘ri JSON"})

    def log_message(self, fmt, *args):
        print("[HTTP]", fmt % args)


if __name__ == "__main__":
    try:
        POOL.start()

        server = ThreadingHTTPServer((HOST, PORT), Handler)
        print(f"[HTTP] API: http://{HOST}:{PORT}")
        print("[HTTP] To‘xtatish uchun Ctrl+C bosing.")

        try:
            server.serve_forever()
        finally:
            server.server_close()

    except KeyboardInterrupt:
        print("\n[HTTP] Server to‘xtatildi.")

    finally:
        with POOL.lock:
            active = list(POOL.active.items())
            POOL.active.clear()

        while True:
            try:
                name, proc = POOL.available.get_nowait()
                active.append((name, proc))
            except queue.Empty:
                break

        for name, proc in active:
            try:
                proc.kill()
                proc.communicate(timeout=2)
            except Exception:
                pass

            try:
                subprocess.run(
                    ["docker", "rm", "-f", name],
                    capture_output=True,
                    timeout=5,
                )
            except Exception:
                pass

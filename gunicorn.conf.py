

import multiprocessing
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# --- Ulanish ---
bind = "127.0.0.1:8000"
backlog = 2048

# --- Protsesslar ---
# SQLite ishlatilgani uchun workers sonini o'rtacha ushlab turamiz:
# juda ko'p worker = SQLite yozuv qulflari uchun raqobat.
_cpu = multiprocessing.cpu_count()
workers = min(_cpu * 2 + 1, 4)
worker_class = "sync"
timeout = 60          # kod bajarish kutish vaqti (CODE_RUNNER_MAX_WAIT=20 dan katta)
keepalive = 5

# --- Loglar (journalctl -u sputnik-django -f) ---
accesslog = "-"
errorlog = "-"
loglevel = os.environ.get("GUNICORN_LOG_LEVEL", "info")
access_log_format = '%(h)s "%(r)s" %(s)s %(D)sµs "%(f)s" "%(a)s"'

# --- Xavfsizlik ---
# Django SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https") ga tayanadi,
# shuning uchun nginx yuboradigan header shu manzildan kelishiga ishonch shart.
forwarded_allow_ips = "127.0.0.1"
limit_request_line = 8190
limit_request_fields = 100

# --- Jarayon ---
preload_app = False
max_requests = 1000        # xotira oqimini himoya qilish uchun
max_requests_jitter = 50

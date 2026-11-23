"""Imtihon nazorati (anti-cheat) uchun AJAX API.

POST /nazorat/<slug>/
    Brauzer (ExamGuard.js) aniqlangan hodisalarni yuboradi.
    Javob: {"ok": true, "soni": N, "chegara": 3, "qoldi": K, "bloklangan": bool}

GET  /nazorat/<slug>/
    Faqat holatni qaytaradi (sahifa ochilganda).
"""

import json
import logging

from django.contrib.auth.mixins import LoginRequiredMixin
from django.http import JsonResponse
from django.views import View

from ..services import nazorat
from ..services.tasks import get_task_for_detail
from .utils import json_error

logger = logging.getLogger(__name__)


class NazoratView(LoginRequiredMixin, View):
    login_url = "login"

    def handle_no_permission(self):
        # fetch() uchun HTML redirect o'rniga JSON qaytaramiz
        return JsonResponse({"ok": False, "error": "Tizimga kiring."}, status=401)

    def _task(self):
        return get_task_for_detail(self.kwargs.get("slug"))

    def get(self, request, *args, **kwargs):
        task = self._task()
        return JsonResponse({"ok": True, **nazorat.holat(task, request.user)})

    def post(self, request, *args, **kwargs):
        task = self._task()

        try:
            data = json.loads(request.body or b"{}")
        except (ValueError, UnicodeDecodeError):
            return json_error("Noto'g'ri JSON.", 400)

        if not isinstance(data, dict):
            return json_error("Noto'g'ri so'rov.", 400)

        events = data.get("events")
        if events is None:
            events = []

        try:
            nazorat.hodisalarni_saqla(task, request.user, events)
        except Exception:
            # Nazorat yozuvi asosiy amalni to'stirmasin
            logger.exception("Nazorat hodisalarini saqlashda xatolik")

        return JsonResponse({"ok": True, **nazorat.holat(task, request.user)})

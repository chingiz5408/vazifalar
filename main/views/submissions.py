"""Kod yuborish (AJAX) view'i."""

import logging

import requests
from django.contrib.auth.mixins import LoginRequiredMixin
from django.http import JsonResponse
from django.views import View

from ..forms import RunCodeForm
from ..services.runner import RunnerError
from ..services.submissions import NoTestCases, submit_solution
from ..services.tasks import get_task_by_slug
from .utils import first_form_error, json_error, nazorat_bloklagan
from ..models import Urinish, Topshiriqlar
import json
 
from django.contrib.auth.mixins import LoginRequiredMixin
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views import View

logger = logging.getLogger(__name__)


class RunCodeView(LoginRequiredMixin, View):
    login_url = "login"

    def post(self, request, *args, **kwargs):
        # 1) Kiruvchi ma'lumotlarni tekshirish
        form = RunCodeForm(self.get_form_data(request))
        if not form.is_valid():
            return json_error(first_form_error(form), 400)

        # 2) Topshiriqni olish
        task = get_task_by_slug(form.cleaned_data["task"])
        if not task:
            return json_error("Topshiriq topilmadi.", 404)

        # Nazorat chegarasi oshgan bo'lsa — topshirish taqiqlanadi
        blok = nazorat_bloklagan(task, request.user)
        if blok is not None:
            return blok

        # 3) Tekshirish va urinishni saqlash
        try:
            payload = submit_solution(request.user, task, form.cleaned_data["code"])
        except NoTestCases:
            return json_error("Bu topshiriq uchun testlar kiritilmagan.", 400)
        except (requests.RequestException, RunnerError, ValueError, KeyError):
            logger.exception("Code Runner xatosi")
            return json_error(
                "Code Runner xizmati bilan bog'lanib bo'lmadi. "
                "Runner servisi ishga tushirilganligini tekshiring.",
                502,
            )

        return JsonResponse(payload)

    @staticmethod
    def get_form_data(request):
        return {
            "code": request.POST.get("code", ""),
            "task": (
                request.POST.get("task")
                or request.POST.get("task_slug")
                or ""
            ).strip(),
        }

class AlgorithmNatija(LoginRequiredMixin, View):
    login_url = "login"
 
    def handle_no_permission(self):
        # fetch() uchun HTML redirect o'rniga JSON qaytaramiz
        return JsonResponse({"ok": False, "error": "Tizimga kiring."}, status=401)
 
    def post(self, request, slug):
        task = get_object_or_404(Topshiriqlar, slug=slug)

        # Nazorat chegarasi oshgan bo'lsa — topshirish taqiqlanadi
        blok = nazorat_bloklagan(task, request.user)
        if blok is not None:
            return blok

        try:
            data = json.loads(request.body)
        except (ValueError, UnicodeDecodeError):
            return JsonResponse({"ok": False, "error": "Noto‘g‘ri JSON."}, status=400)
        if not isinstance(data, dict):
            return JsonResponse({"ok": False, "error": "Noto‘g‘ri so‘rov."}, status=400)
 
        passed, total = data.get("passed"), data.get("total")
        valid_numbers = (
            isinstance(passed, int) and not isinstance(passed, bool)
            and isinstance(total, int) and not isinstance(total, bool)
            and 0 <= passed <= total and total > 0
        )
        if not valid_numbers:
            return JsonResponse({"ok": False, "error": "passed/total noto‘g‘ri."}, status=400)
 
        diagram = data.get("diagram")
        if not isinstance(diagram, dict):
            return JsonResponse({"ok": False, "error": "Diagramma topilmadi."}, status=400)
 
        details = data.get("details")
        if not isinstance(details, list):
            details = []
 
        accepted = passed == total
        urinish = Urinish.objects.create(
            user=request.user,
            task=task,
            language="algoritm",
            code=json.dumps(diagram, ensure_ascii=False, separators=(",", ":")),
            status=Urinish.Holat.ACCEPTED if accepted else Urinish.Holat.WRONG_ANSWER,
            passed=passed,
            total=total,
            score=task.max_score if accepted else 0,
            details=details,
        )
 
        return JsonResponse({
            "ok": True,
            "number": urinish.number,
            "status": urinish.status,
            "status_label": urinish.get_status_display(),
            "score": urinish.score,
        })
 
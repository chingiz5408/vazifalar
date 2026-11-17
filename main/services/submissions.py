"""Kod yuborish (submission) bilan bog'liq biznes-logika:

testlarni olish -> tekshirish -> urinishni saqlash -> javob shakllantirish.
"""

from django.conf import settings

from ..models import TestCase, Urinish
from .judging import final_status, judge_all

SUPPORTED_LANGUAGE = settings.CODE_RUNNER_SUPPORTED_LANGUAGE


class NoTestCases(Exception):
    """Topshiriq uchun test-case'lar kiritilmagan."""


def get_task_tests(task):
    """Topshiriqning barcha test-case'lari (tartib bo'yicha)."""
    return list(TestCase.objects.filter(task=task).order_by("order", "id"))


def save_attempt(user, task, code, passed, details):
    """Urinishni bazaga yozadi."""
    total = len(details)
    return Urinish.objects.create(
        user=user,
        task=task,
        language=SUPPORTED_LANGUAGE,
        code=code,
        status=final_status(passed, details),
        passed=passed,
        total=total,
        score=round(task.max_score * passed / total) if total else 0,
        details=details,
    )


def serialize_attempt(attempt):
    """Urinishni JSON uchun lug'atga aylantiradi."""
    return {
        "number": attempt.number,
        "language": attempt.language_label,
        "status": attempt.status,
        "status_label": attempt.get_status_display(),
        "created": attempt.created_at.strftime("%d.%m.%Y %H:%M"),
    }


def get_user_attempts(user, task, limit=20):
    """Foydalanuvchining shu topshiriq bo'yicha oxirgi urinishlari."""
    return list(Urinish.objects.filter(user=user, task=task)[:limit])


def is_task_completed(user, task):
    """Foydalanuvchi shu topshiriqni kamida bir marta to'liq yechganmi."""
    return Urinish.objects.filter(
        user=user, task=task, status=Urinish.Holat.ACCEPTED
    ).exists()


def submit_solution(user, task, code):
    """Kodni testlar bo'yicha tekshiradi, urinishni saqlaydi va javob qaytaradi.

    `NoTestCases` — testlar yo'q bo'lsa.
    `runner.RunnerError` / `requests.RequestException` — runner ishlamasa.
    """
    tests = get_task_tests(task)
    if not tests:
        raise NoTestCases("Bu topshiriq uchun testlar kiritilmagan.")

    passed, details = judge_all(code, tests)
    attempt = save_attempt(user, task, code, passed, details)
    total = len(details)

    return {
        "status": attempt.status,
        "passed": passed,
        "total": total,
        "score": attempt.score,
        "details": details,
        "output": f"Testlar natijasi: {passed}/{total}",
        "attempt": serialize_attempt(attempt),
    }

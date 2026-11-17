"""Topshiriq sahifalari uchun ma'lumot yig'ish."""

from django.shortcuts import get_object_or_404
from django.urls import NoReverseMatch, reverse

from ..models import Topshiriqlar
from .submissions import get_user_attempts, is_task_completed

STARTER_CODE = "# Kodingizni shu yerda yozing\n"
TASK_DETAIL_URL_NAME = "tasks"


def get_task_by_slug(slug):
    return Topshiriqlar.objects.filter(slug=slug).first()


def get_task_for_detail(slug):
    """Topshiriqni sahifa uchun kerakli bog'lanishlar bilan bir marta oladi."""
    return get_object_or_404(
        Topshiriqlar.objects
        .select_related("mavzu__module")
        .prefetch_related("test_savollar__variantlar"),
        slug=slug,
    )


def get_test_questions(task):
    return task.test_savollar.all()


def get_sample_test(task):
    """Namuna test: is_sample=True bo'lgani, bo'lmasa eng birinchisi."""
    return task.test_cases.filter(is_sample=True).first() or task.test_cases.first()


def get_task_position(task):
    """Topshiriqning mavzu ichidagi o'rni, jami soni va keyingi topshiriq."""
    siblings = list(task.mavzu.topshiriqlar.order_by("created_at", "id"))
    ids = [t.id for t in siblings]
    index = ids.index(task.id) if task.id in ids else 0
    next_task = siblings[index + 1] if index + 1 < len(siblings) else None
    return index + 1, len(siblings), next_task


def get_next_task_url(next_task):
    if not next_task:
        return None
    try:
        return reverse(TASK_DETAIL_URL_NAME, kwargs={"slug": next_task.slug})
    except NoReverseMatch:
        return None


def get_avatar_initial(user):
    return (user.get_full_name() or user.username)[:1].upper()


def get_programming_workspace(user, task):
    """Programming topshirig'i sahifasi uchun kontekst ma'lumotlari."""
    attempts = get_user_attempts(user, task)
    last_attempt = attempts[0] if attempts else None
    position, total, next_task = get_task_position(task)

    return {
        "module": task.mavzu.module,
        "mavzu": task.mavzu,
        "programming": task.programming.first(),
        "sample_test": get_sample_test(task),
        "attempts": attempts,
        "is_complete": is_task_completed(user, task),
        "initial_code": last_attempt.code if last_attempt else STARTER_CODE,
        "starter_code": STARTER_CODE,
        "position": position,
        "total": total,
        "next_task_url": get_next_task_url(next_task),
        "avatar_initial": get_avatar_initial(user),
    }


def get_algorithm_tests(task):
    """Algoritm topshirig'i testlari (`TestCase`, tartib bo'yicha).

    Testlar `input_data` / `expected_output` matnlarida saqlanadi:
    - nomli format: `a=5`, `b=3`;
    - pozitsion format: har bir qatorda bitta qiymat (`5`, `3`).

    Shablonga JSON sifatida beriladi.
    """
    return [
        {
            "order": test.order,
            "input": test.input_data,
            "expected": test.expected_output,
            "is_sample": test.is_sample,
        }
        for test in task.test_cases.order_by("order", "id")
    ]


def get_algorithm_workspace(user, task):
    """Algorithm topshirig'i sahifasi uchun kontekst ma'lumotlari."""
    position, total, next_task = get_task_position(task)

    return {
        "module": task.mavzu.module,
        "mavzu": task.mavzu,
        "algorithm_tests": get_algorithm_tests(task),
        "position": position,
        "total": total,
        "next_task_url": get_next_task_url(next_task),
        "avatar_initial": get_avatar_initial(user),
    }

"""Biznes-logika qatlami.

View'lar faqat HTTP bilan ishlaydi, barcha hisob-kitob va so'rovlar
shu paketdagi modullarda joylashgan:

- `runner`      — Code Runner servisi bilan HTTP aloqasi
- `judging`     — test-case'lar bo'yicha tekshirish (judge)
- `submissions` — kod yuborish, urinishlarni saqlash
- `tasks`       — topshiriq sahifalari ma'lumotlari
- `dashboard`   — talaba statistikasi
- `quiz`        — test topshiriqlarini baholash
"""

from .dashboard import get_student_dashboard
from .judging import final_status, judge_all, judge_test, normalize_input, normalize_output
from .quiz import get_test_task, grade_answers, submit_test
from .runner import RunnerError, run_in_runner
from .submissions import (
    NoTestCases,
    get_task_tests,
    get_user_attempts,
    is_task_completed,
    save_attempt,
    serialize_attempt,
    submit_solution,
)
from .tasks import (
    STARTER_CODE,
    get_algorithm_tests,
    get_algorithm_workspace,
    get_avatar_initial,
    get_next_task_url,
    get_programming_workspace,
    get_sample_test,
    get_task_by_slug,
    get_task_for_detail,
    get_task_position,
    get_test_questions,
)

__all__ = [
    "RunnerError",
    "STARTER_CODE",
    "NoTestCases",
    "final_status",
    "get_algorithm_tests",
    "get_algorithm_workspace",
    "get_avatar_initial",
    "get_next_task_url",
    "get_programming_workspace",
    "get_sample_test",
    "get_student_dashboard",
    "get_task_by_slug",
    "get_task_for_detail",
    "get_task_position",
    "get_task_tests",
    "get_test_questions",
    "get_test_task",
    "get_user_attempts",
    "grade_answers",
    "is_task_completed",
    "judge_all",
    "judge_test",
    "normalize_input",
    "normalize_output",
    "run_in_runner",
    "save_attempt",
    "serialize_attempt",
    "submit_solution",
    "submit_test",
]

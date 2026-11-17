"""Kod natijalarini test-case'lar bilan solishtirish (judge)."""

from ..models import Urinish
from .runner import run_in_runner


def normalize_output(text):
    """Solishtirish uchun: \\r\\n -> \\n, qator oxiridagi probellar va chetlar olib tashlanadi."""
    text = (text or "").replace("\r\n", "\n").strip()
    return "\n".join(line.rstrip() for line in text.split("\n"))


def normalize_input(text):
    """Runner'ga yuboriladigan kirish: \\r\\n -> \\n va oxirida bitta yangi qator."""
    return (text or "").replace("\r\n", "\n").rstrip("\n") + "\n"


def judge_test(code, test, number):
    """Bitta testni tekshiradi va uning natijasini (detail) qaytaradi."""
    result = run_in_runner(code, normalize_input(test.input_data))

    actual = normalize_output(result["stdout"])
    expected = normalize_output(test.expected_output)
    error = ""

    if result["timed_out"]:
        status = "runtime_error"
        error = "Vaqt chegarasidan oshdi."
    elif result["returncode"] != 0:
        status = "runtime_error"
        error = result["stderr"]
    elif actual == expected:
        status = "accepted"
    else:
        status = "wrong_answer"

    detail = {
        "test": number,
        "status": status,
        "time_seconds": result["time_seconds"],
    }

    # Faqat namuna testda kutilgan/haqiqiy natija ko'rsatiladi
    # (yashirin testlar javobi foydalanuvchiga ochilmaydi).
    if test.is_sample:
        detail["input"] = test.input_data
        detail["expected"] = expected
        detail["actual"] = actual

    if error:
        detail["error"] = error[-500:]

    return detail


def judge_all(code, tests):
    """Barcha testlarni ketma-ket tekshiradi. (passed, details) qaytaradi."""
    details = [
        judge_test(code, test, number)
        for number, test in enumerate(tests, start=1)
    ]
    passed = sum(1 for d in details if d["status"] == "accepted")
    return passed, details


def final_status(passed, details):
    """Urinishning umumiy holatini aniqlaydi."""
    if passed == len(details):
        return Urinish.Holat.ACCEPTED
    if passed == 0 and any(d["status"] == "runtime_error" for d in details):
        return Urinish.Holat.RUNTIME_ERROR
    return Urinish.Holat.WRONG_ANSWER

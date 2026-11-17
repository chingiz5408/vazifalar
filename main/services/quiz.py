"""Test (savol-javob) topshiriqlarini baholash."""

from django.shortcuts import get_object_or_404

from ..models import TestResult, TestSavollar, TestVariantlari, Topshiriqlar


def get_test_task(slug):
    return get_object_or_404(
        Topshiriqlar,
        slug=slug,
        turi=Topshiriqlar.TopshiriqTuri.TEST,
    )


def grade_answers(task, answer_ids):
    """Belgilangan variantlarni tekshiradi. (score, total_questions) qaytaradi."""
    correct_question_ids = set(
        TestSavollar.objects.filter(
            topshiriq=task,
            variantlar__is_correct=True,
        ).values_list("id", flat=True).distinct()
    )

    selected_variants = TestVariantlari.objects.filter(
        id__in=answer_ids,
        topshiriq__topshiriq=task,
    ).values("id", "topshiriq_id", "is_correct")

    selected_by_question = {}
    for variant in selected_variants:
        selected_by_question.setdefault(variant["topshiriq_id"], []).append(
            variant["is_correct"]
        )

    score = sum(
        1
        for question_id, answers in selected_by_question.items()
        if question_id in correct_question_ids
        and len(answers) == 1
        and answers[0]
    )

    return score, len(correct_question_ids)


def save_test_result(user, task, score):
    return TestResult.objects.create(user=user, test=task, score=score)


def submit_test(user, task, answer_ids):
    """Testni baholaydi va natijani saqlaydi."""
    score, total_questions = grade_answers(task, answer_ids)
    result = save_test_result(user, task, score)

    return {
        "score": score,
        "total_questions": total_questions,
        "result_id": result.id,
    }

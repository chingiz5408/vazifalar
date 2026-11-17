"""Talabaning o'quv natijalari (dashboard) statistikasi."""

from ..models import Module, TestResult, Topshiriqlar, Urinish

STATUS_LABELS = {
    "passed": "Bajarilgan",
    "failed": "Qanoatsiz",
    "pending": "Topshirilmagan",
}


def _attempt_index(user):
    """Foydalanuvchi urinishlari bo'yicha: urinib ko'rilgan va o'tilgan topshiriqlar."""
    attempted = set()
    accepted = set()
    attempts_count = 0

    for row in Urinish.objects.filter(user=user).values("task_id", "status"):
        task_id = row["task_id"]
        attempts_count += 1
        attempted.add(task_id)
        if row["status"] == Urinish.Holat.ACCEPTED:
            accepted.add(task_id)

    return attempted, accepted, attempts_count


def _recent_activity(user, limit=5):
    """Oxirgi faoliyat: dasturlash urinishlari va test natijalari aralash."""
    items = []

    for row in Urinish.objects.filter(user=user).select_related("task")[:limit]:
        items.append(
            {
                "kind": "attempt",
                "icon": "⌨",
                "title": row.task.title,
                "label": f"{row.language_label} · {row.passed}/{row.total} test",
                "status_label": row.get_status_display(),
                "ok": row.status == Urinish.Holat.ACCEPTED,
                "created_at": row.created_at,
            }
        )

    for row in (
        TestResult.objects.filter(user=user)
        .select_related("test")
        .order_by("-created_at")[:limit]
    ):
        items.append(
            {
                "kind": "test",
                "icon": "✓",
                "title": row.test.title,
                "label": "Test natijasi",
                "status_label": f"{row.score} ball",
                "ok": row.score > 0,
                "created_at": row.created_at,
            }
        )

    items.sort(key=lambda item: item["created_at"], reverse=True)
    return items[:limit]


def _best_test_scores(user):
    """Test topshiriqlari bo'yicha eng yuqori natija: {task_id: score}."""
    best = {}
    for row in TestResult.objects.filter(user=user).values("test_id", "score"):
        task_id = row["test_id"]
        best[task_id] = max(best.get(task_id, -1), row["score"])
    return best


def _best_urinish_scores(user):
    """Kod topshiriqlari bo'yicha eng yuqori ball: {task_id: score}."""
    best = {}
    for row in Urinish.objects.filter(user=user).values("task_id", "score"):
        task_id = row["task_id"]
        best[task_id] = max(best.get(task_id, 0), row["score"])
    return best


def _task_points(task, test_scores, urinish_best):
    """Bir topshiriqning talaba uchun yig'ilgan bali."""
    if task.turi == Topshiriqlar.TopshiriqTuri.TEST:
        score = test_scores.get(task.id)
        if score is None:
            return 0
        questions = task.test_savollar.count()
        if questions <= 0:
            return 0
        return round(task.max_score * min(score, questions) / questions)
    return urinish_best.get(task.id, 0)


def _resolve_task_status(task, test_scores, attempted, accepted):
    """Topshiriqning foydalanuvchi uchun holati: passed / failed / pending."""
    if task.turi == Topshiriqlar.TopshiriqTuri.TEST:
        if task.id not in test_scores:
            return "pending"
        score = test_scores[task.id]
        total_questions = task.test_savollar.count()
        if (total_questions > 0 and score >= total_questions) or score > 0:
            return "passed"
        return "failed"

    if task.id in accepted:
        return "passed"
    if task.id in attempted:
        return "failed"
    return "pending"


def get_student_dashboard(user):
    """Dashboard uchun modullar (topshiriqlar holati bilan) va umumiy statistika."""
    modules = list(
        Module.objects.prefetch_related(
            "mavzular__resurslar",
            "mavzular__topshiriqlar__test_savollar",
        )
    )

    attempted, accepted, attempts_count = _attempt_index(user)
    test_scores = _best_test_scores(user)
    urinish_best = _best_urinish_scores(user)

    total_tasks = 0
    passed_count = 0
    failed_count = 0
    pending_count = 0

    total_points = 0   # talaba yig'an ballar
    max_points = 0     # barcha topshiriqlarning maksimal bali

    active_topic = None
    topic_results = []

    for module in modules:
        module_total = 0
        module_passed = 0

        for topic in module.mavzular.all():
            topic_total = 0
            topic_passed = 0
            topic_failed = 0
            topic_pending = 0

            for task in topic.topshiriqlar.all():
                status = _resolve_task_status(task, test_scores, attempted, accepted)

                task.user_status = status
                task.status_label = STATUS_LABELS[status]

                topic_total += 1
                total_tasks += 1
                module_total += 1

                # --- ball yig'ish tizimi ---
                total_points += _task_points(task, test_scores, urinish_best)
                max_points += task.max_score

                if status == "passed":
                    topic_passed += 1
                    passed_count += 1
                    module_passed += 1
                elif status == "failed":
                    topic_failed += 1
                    failed_count += 1
                else:
                    topic_pending += 1
                    pending_count += 1

            topic.total_tasks = topic_total
            topic.passed_tasks = topic_passed
            topic.failed_tasks = topic_failed
            topic.pending_tasks = topic_pending
            topic.progress_percent = (
                round((topic_passed / topic_total) * 100) if topic_total > 0 else 0
            )

            # Faol dars materiallari (video, PDF, manbalar).
            # Ichida hech narsa bo'sh qolgan yozuvlar ko'rsatilmaydi.
            topic.resurslar_faol = [
                r
                for r in topic.resurslar.all()
                if r.is_active and (r.url or r.file)
            ]

            # --- mavzu bo'yicha natija (statistika uchun) ---
            has_tasks = topic_total > 0
            done = has_tasks and topic_passed == topic_total

            if not has_tasks:
                label, tag = "Topshiriq yo‘q", "muted"
            elif done:
                label, tag = "Bajarilgan", "done"
            elif topic.is_active:
                label, tag = "Jarayonda", "active"
            elif topic_passed > 0:
                label, tag = "Qisman", "partial"
            else:
                label, tag = "Bajarilmagan", "missed"

            info = {
                "name": topic.name,
                "slug": topic.slug,
                "module_name": module.name,
                "is_active": topic.is_active,
                "has_tasks": has_tasks,
                "done": done,
                "label": label,
                "tag": tag,
                "total": topic_total,
                "passed": topic_passed,
                "failed": topic_failed,
                "pending": topic_pending,
                "percent": topic.progress_percent,
            }
            topic_results.append(info)
            if topic.is_active:
                active_topic = info

        module.total_tasks = module_total
        module.passed_tasks = module_passed
        module.progress_percent = (
            round((module_passed / module_total) * 100) if module_total > 0 else 0
        )

    return {
        "modules": modules,
        "total_tasks": total_tasks,
        "passed_count": passed_count,
        "failed_count": failed_count,
        "pending_count": pending_count,
        "overall_percent": (
            round((passed_count / total_tasks) * 100) if total_tasks > 0 else 0
        ),
        # ---- qo'shimcha statistika ----
        "accepted_tasks": len(accepted),
        "attempts_count": attempts_count,
        "total_points": total_points,
        "max_points": max_points,
        "points_percent": (
            round((total_points / max_points) * 100) if max_points > 0 else 0
        ),
        "recent_activity": _recent_activity(user),
        # ---- faol mavzu va mavzular bo'yicha natija ----
        "active_topic": active_topic,
        "topic_results": sorted(topic_results, key=lambda t: not t["is_active"]),
    }

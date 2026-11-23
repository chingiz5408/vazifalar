"""View'lar uchun umumiy yordamchi funksiyalar."""

from django.http import JsonResponse

from ..services import nazorat as nazorat_service


def json_error(message, status=400):
    """Xatoni bir xil formatda qaytaradi."""
    return JsonResponse({"status": "error", "output": message}, status=status)


def nazorat_bloklagan(task, user):
    """Nazorat chegarasi oshgan bo'lsa topshirishni bloklaydi.

    Hamma frontend bir xil formatda o'qiydi:
      - test.html      -> data.error
      - kod_yozish     -> data.output || data.error
      - algoritm       -> data.ok / data.error

    Chegara oshmagan bo'lsa None qaytaradi (davom etish mumkin).
    """
    holat = nazorat_service.holat(task, user)
    if not holat["bloklangan"]:
        return None

    message = (
        f"Nazorat chegarasi oshdi: {holat['soni']} ta buzilish aniqlandi "
        f"(chegara: {holat['chegara']}). "
        f"«{task.title}» topshiriqini topshira olmaysiz."
    )
    return JsonResponse(
        {
            "ok": False,
            "status": "error",
            "blocked": True,
            "error": message,
            "output": message,
            **holat,
        },
        status=403,
    )


def first_form_error(form):
    """Formadagi birinchi xato xabarini qaytaradi."""
    for errors in form.errors.values():
        if errors:
            return errors[0]
    return "Ma'lumotlar noto'g'ri."

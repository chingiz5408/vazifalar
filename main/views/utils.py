"""View'lar uchun umumiy yordamchi funksiyalar."""

from django.http import JsonResponse


def json_error(message, status=400):
    """Xatoni bir xil formatda qaytaradi."""
    return JsonResponse({"status": "error", "output": message}, status=status)


def first_form_error(form):
    """Formadagi birinchi xato xabarini qaytaradi."""
    for errors in form.errors.values():
        if errors:
            return errors[0]
    return "Ma'lumotlar noto'g'ri."

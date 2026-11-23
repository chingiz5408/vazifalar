"""Imtihon nazorati (anti-cheat) servisi.

Brauzerdan (ExamGuard.js) kelgan hodisalarni saqlaydi va
jiddiy buzilishlar sonini hisoblaydi.

Chegara (NAZORAT_CHEGARASI, odatda 3) oshsa — topshirish bloklanadi.
"""

from django.conf import settings

from ..models import NazoratHodisasi

# Bir so'rovda saqlanadigan maksimal hodisa soni (spam himoyasi)
MAX_EVENTS_PER_REQUEST = 20


def chegara():
    """Ruxsat etilgan jiddiy buzilishlar soni."""
    try:
        value = int(getattr(settings, "NAZORAT_CHEGARASI", 3))
    except (TypeError, ValueError):
        value = 3
    return max(1, value)


def buzilish_sonini_ol(task, user):
    """Foydalanuvchining shu topshiriqdagi JIDDIY buzilishlari soni."""
    return (
        NazoratHodisasi.objects.filter(
            task=task,
            user=user,
            code__in=NazoratHodisasi.JIDDIY_KODLAR,
        )
        .count()
    )


def bloklanganmi(task, user):
    """Buzilishlar chegara dan oshganmi? (oshsa — topshirish taqiqlanadi)"""
    return buzilish_sonini_ol(task, user) >= chegara()


def hodisalarni_saqla(task, user, events):
    """Brauzerdan kelgan hodisalarni bazaga yozadi.

    Har bir hodisada `uid` bo'lsa, qayta yuborilgan (dublikat) hodisalar
    e'tiborsiz qoldiriladi — shu bilan bir xil buzilish ikki marta sanalmaydi.

    Yangi jiddiy buzilishlar sonini qaytaradi (umumiy son emas).
    """
    if not isinstance(events, list) or not events:
        return 0

    yangi_jiddiy = 0
    yaratilgan = []

    for event in events[:MAX_EVENTS_PER_REQUEST]:
        if not isinstance(event, dict):
            continue

        code = str(event.get("code", "")).strip()[:40]
        if code not in NazoratHodisasi.Kod.values:
            continue

        uid = str(event.get("uid", "")).strip()[:64]
        if uid and NazoratHodisasi.objects.filter(
            task=task, user=user, uid=uid
        ).exists():
            continue  # allaqachon yozilgan (qayta yuborilgan)

        message = str(event.get("message", ""))[:500]

        yaratilgan.append(
            NazoratHodisasi(
                task=task, user=user, code=code, message=message, uid=uid
            )
        )
        if code in NazoratHodisasi.JIDDIY_KODLAR:
            yangi_jiddiy += 1

    if yaratilgan:
        NazoratHodisasi.objects.bulk_create(yaratilgan)

    return yangi_jiddiy


def holat(task, user):
    """Shablon va API uchun to'liq holat."""
    soni = buzilish_sonini_ol(task, user)
    limit = chegara()
    return {
        "soni": soni,
        "chegara": limit,
        "qoldi": max(0, limit - soni),
        "bloklangan": soni >= limit,
    }

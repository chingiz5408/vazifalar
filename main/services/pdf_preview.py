"""PDF birinchi sahifasining mini-ko‘rinishini (preview) yaratish.

PDF serverda saqlangan holda, uning birinchi sahifasi PNG rasmga
aylantiriladi va kartada ko‘rsatiladi. Fayl har biriksa qayta yaratiladi.
"""

from django.core.files.base import ContentFile

PREVIEW_WIDTH = 480  # piksel (kenglik)


def generate_pdf_preview(resurs, width=PREVIEW_WIDTH):
    """PDF faylning birinchi sahifasini PNG ko‘rinishida saqlaydi.

    Muammo bo‘lsa (PyMuPDF o‘rnatilmagan, noto‘g‘ri fayl va h.k.)
    False qaytaradi va resurs oddiy PDF belgisi bilan ko‘rinaveradi.
    """
    if resurs.turi != "pdf" or not resurs.file:
        return False

    try:
        import pymupdf
    except ImportError:
        return False

    try:
        with resurs.file.open("rb") as fh:
            doc = pymupdf.open(stream=fh.read(), filetype="pdf")
            page = doc[0]
            zoom = width / page.rect.width
            pix = page.get_pixmap(
                matrix=pymupdf.Matrix(zoom, zoom), alpha=False
            )
            png_bytes = pix.tobytes("png")
            doc.close()
    except Exception:
        return False

    # Eski ko‘rinishni o‘chiramiz (bir nechta fayl to‘planib ketmasligi uchun)
    if resurs.preview:
        resurs.preview.delete(save=False)

    name = f"resurs_{resurs.pk}_preview.png"
    resurs.preview.save(name, ContentFile(png_bytes), save=False)
    return True

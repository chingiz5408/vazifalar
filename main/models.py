from django.db import models
from django.db.models.signals import post_delete
from django.dispatch import receiver
from django.utils.text import slugify
from django.contrib.auth.models import AbstractUser
from django.db import transaction
from django.conf import settings

class User(AbstractUser):
    phone = models.CharField(max_length=20, blank=True)


class Module(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
    
    class Meta:
        verbose_name = "Module"
        verbose_name_plural = "Modullar"


class Mavzular(models.Model):
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name="mavzular")
    name = models.CharField(max_length=100)
    description = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active=models.BooleanField(default=False)
    slug = models.SlugField(unique=True, blank=True, null=True, max_length=255)

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name) or "mavzu"
            slug = base_slug
            counter = 1
            while Mavzular.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name
    
    class Meta:
        verbose_name = "Mavzu"
        verbose_name_plural = "Mavzular"


class Resurs(models.Model):
    """Mavzu bo'yicha dars materiallari (video, PDF, manba)."""

    class Turi(models.TextChoices):
        VIDEO = "video", "Video darslik"
        PDF = "pdf", "PDF qo‘llanma"
        LINK = "link", "Qo‘shimcha manba"

    mavzu = models.ForeignKey(
        Mavzular, on_delete=models.CASCADE, related_name="resurslar"
    )
    turi = models.CharField(max_length=10, choices=Turi.choices, default=Turi.VIDEO)
    title = models.CharField(max_length=200)
    url = models.URLField(
        blank=True,
        help_text="YouTube yoki tashqi manba havolasi",
    )
    file = models.FileField(
        upload_to="resurslar/%Y/%m/",
        blank=True,
        help_text="PDF uchun faylni yuklang",
    )
    preview = models.FileField(
        upload_to="resurslar/preview/",
        blank=True,
        null=True,
        help_text="PDF birinchi sahifasining ko‘rinishi (avtomatik yaratiladi)",
    )
    description = models.TextField(blank=True, null=True)
    order = models.PositiveIntegerField(default=1)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order", "id"]
        verbose_name = "Resurs"
        verbose_name_plural = "Resurslar"

    def __str__(self):
        return f"{self.get_turi_display()} — {self.title}"

    @property
    def youtube_id(self):
        """YouTube havolasidan video ID ajratib oladi."""
        return extract_youtube_id(self.url)

    @property
    def display_url(self):
        """Sahifada ko‘rsatiladigan havola: PDF fayl bo‘lsa — u, aks holda URL."""
        if self.file:
            return self.file.url
        return self.url

    @property
    def file_size_label(self):
        """Fayl hajmini o‘qiladigan ko‘rinishda: 512 B / 1.2 MB / 3.4 GB."""
        try:
            size = self.file.size
        except Exception:
            return ""
        if size < 1024:
            return f"{size} B"
        if size < 1024 ** 2:
            return f"{size / 1024:.1f} KB"
        if size < 1024 ** 3:
            return f"{size / 1024 ** 2:.1f} MB"
        return f"{size / 1024 ** 3:.1f} GB"

    def delete(self, *args, **kwargs):
        """Yozuv o‘chirilganda serverdagi fayllarni ham olib tashlaydi."""
        self._remove_storage_files()
        super().delete(*args, **kwargs)

    def _remove_storage_files(self):
        """file va preview fayllarini diskdan o‘chiradi (xato bo‘lsa jim o‘tkazadi)."""
        for field_name in ("file", "preview"):
            field = getattr(self, field_name)
            if field:
                try:
                    field.delete(save=False)
                except Exception:
                    pass


@receiver(post_delete, sender=Resurs)
def cleanup_resurs_files(sender, instance, **kwargs):
    """Resurs o‘chirilsa (admin orqali, queryset.delete() yoki kaskad) —
    serverdagi fayllar ham qolmasligi uchun.

    post_delete signal queryset.delete() holatida ham uchraydi, shuning uchun
    faqat delete() metodiga bog'lanmaslik kerak.
    """
    instance._remove_storage_files()


def extract_youtube_id(url):
    """Turli xil YouTube havolalaridan video ID chiqaradi.

    https://www.youtube.com/watch?v=abc123
    https://youtu.be/abc123
    https://www.youtube.com/embed/abc123
    https://www.youtube.com/shorts/abc123
    """
    if not url:
        return ""
    url = url.strip()
    for marker in ("v=", "youtu.be/", "embed/", "shorts/", "live/"):
        if marker in url:
            part = url.split(marker, 1)[1]
            return part.split("&")[0].split("?")[0].split("/")[0]
    return ""


class Topshiriqlar(models.Model):
    class TopshiriqTuri(models.TextChoices):
        TEST = "test", "Test"
        YOZMA = "yozma", "Yozma savollar"
        PROGRAMMING = "programming", "Programming"
        ALGORITHM = "algorithm", "Algorithm"

    turi = models.CharField(
        max_length=20,
        choices=TopshiriqTuri.choices,
        default=TopshiriqTuri.PROGRAMMING
    )
    mavzu = models.ForeignKey(Mavzular, on_delete=models.CASCADE, related_name="topshiriqlar")
    title = models.TextField()
    description = models.TextField(null=True, blank=True)
    max_score = models.PositiveIntegerField(default=100)
    created_at = models.DateTimeField(auto_now_add=True)
    slug = models.SlugField(unique=True, blank=True, null=True, max_length=255)

    @property
    def discriptions(self):
        """Eski nom bilan murojaat qilinganda moslik uchun."""
        return self.description

    def __str__(self):
        return f"{self.id} -- {self.title}"

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.title) or "topshiriq"
            slug = base_slug
            counter = 1
            while Topshiriqlar.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = "Topshiriq"
        verbose_name_plural = "Topshiriqlar"


class TestCase(models.Model):
    task = models.ForeignKey(
        Topshiriqlar,
        on_delete=models.CASCADE,
        related_name="test_cases"
    )

    input_data = models.TextField()
    expected_output = models.TextField()

    is_sample = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return f"{self.task} — Test {self.order}"


class TestSavollar(models.Model):
    topshiriq = models.ForeignKey(Topshiriqlar, on_delete=models.CASCADE, related_name="test_savollar")
    text = models.TextField()
    slug = models.SlugField(unique=True, blank=True, null=True, max_length=255)

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.text[:50]) or "savol"
            slug = base_slug
            counter = 1
            while TestSavollar.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.text}"

    class Meta:
        verbose_name = "Test savol"
        verbose_name_plural = "Test savollar"


class TestVariantlari(models.Model):
    topshiriq = models.ForeignKey(TestSavollar, on_delete=models.CASCADE, related_name="variantlar")
    text = models.CharField(max_length=50)
    is_correct = models.BooleanField(default=False)
    slug = models.SlugField(unique=True, blank=True, null=True, max_length=255)

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.text) or "variant"
            slug = base_slug
            counter = 1
            while TestVariantlari.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = "Test variant"
        verbose_name_plural = "Test variantlari"


class TestResult(models.Model):
    test = models.ForeignKey(Topshiriqlar, on_delete=models.CASCADE, related_name="test_results")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="test_results")
    score = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user} - {self.test} - {self.score}"
    
    class Meta:
        verbose_name = "Test natijasi"
        verbose_name_plural = "Test natijalari"


class Yozmavazifalar(models.Model):
    topshiriq = models.OneToOneField(Topshiriqlar, on_delete=models.CASCADE, related_name="yozma_vazifa")
    text = models.TextField()
    slug = models.SlugField(unique=True, blank=True, null=True, max_length=255)

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.text[:50]) or "yozma"
            slug = base_slug
            counter = 1
            while Yozmavazifalar.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.text}"

    class Meta:
        verbose_name = "Yozma vazifa"
        verbose_name_plural = "Yozma vazifalar"


class ProgrammingVazifalar(models.Model):
    topshiriq = models.ForeignKey(Topshiriqlar, on_delete=models.CASCADE, related_name="programming")
    time_limit = models.PositiveIntegerField(default=2)
    memory_limit = models.PositiveIntegerField(default=128)
    input_variables = models.PositiveIntegerField()
    output_variables = models.PositiveIntegerField()
    slug = models.SlugField(unique=True, blank=True, null=True, max_length=255)

    def save(self, *args, **kwargs):
        if not self.slug:
            task_id = self.topshiriq_id or (self.topshiriq.id if self.topshiriq else "new")
            base_slug = f"programming-{task_id}"
            slug = base_slug
            counter = 1
            while ProgrammingVazifalar.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Topshiriq ID: {self.topshiriq_id}"

    class Meta:
        verbose_name = "Programming Vazifa"
        verbose_name_plural = "Programming Vazifalar"

class Urinish(models.Model):
    class Holat(models.TextChoices):
        ACCEPTED = "accepted", "O‘tdi"
        WRONG_ANSWER = "wrong_answer", "Noto‘g‘ri javob"
        RUNTIME_ERROR = "runtime_error", "Dastur xatosi"
        ERROR = "error", "Tizim xatosi"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="urinishlar",
    )
    task = models.ForeignKey(
        Topshiriqlar,
        on_delete=models.CASCADE,
        related_name="urinishlar",
    )

    number = models.PositiveIntegerField(editable=False)  # shu foydalanuvchining shu topshiriqdagi tartib raqami
    language = models.CharField(max_length=20, default="python")
    code = models.TextField()

    status = models.CharField(max_length=20, choices=Holat.choices)
    passed = models.PositiveIntegerField(default=0)
    total = models.PositiveIntegerField(default=0)
    score = models.PositiveIntegerField(default=0)
    details = models.JSONField(default=list, blank=True)  # har bir test natijasi

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        verbose_name = "Urinish"
        verbose_name_plural = "Urinishlar"
        constraints = [
            models.UniqueConstraint(
                fields=["user", "task", "number"],
                name="unique_urinish_number",
            )
        ]

    def __str__(self):
        return f"{self.user} — {self.task_id} — #{self.number} ({self.status})"

    @property
    def language_label(self):
        return {"python": "Python"}.get(self.language, self.language)

    def save(self, *args, **kwargs):
        if not self.pk and not self.number:
            with transaction.atomic():
                last = (
                    Urinish.objects.select_for_update()
                    .filter(user=self.user, task=self.task)
                    .order_by("-number")
                    .values_list("number", flat=True)
                    .first()
                )
                self.number = (last or 0) + 1
                return super().save(*args, **kwargs)
        return super().save(*args, **kwargs)

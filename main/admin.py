from django.contrib import admin
from .models import (
    User,
    Module,
    Urinish,
    Mavzular,
    Resurs,
    TestCase,
    TestResult,
    Topshiriqlar,
    TestSavollar,
    TestVariantlari,
    Yozmavazifalar,
    ProgrammingVazifalar,
)
from django.contrib.auth.admin import UserAdmin
from django import forms
from django.contrib.auth.forms import UserCreationForm, UserChangeForm

from .services.pdf_preview import generate_pdf_preview


@admin.register(TestResult)
class TestResultAdmin(admin.ModelAdmin):
    list_display = ["test", "user", "score", "created_at"]
    list_filter = ["test", "user", "created_at"]
    search_fields = ["test__title", "user__username"]
    ordering = ["-created_at"]

@admin.register(Urinish)
class UrinishlarAdmin(admin.ModelAdmin):
    list_display = ["user", "task", "code", "status", "created_at"]
    list_filter = ["status", "created_at"]
    search_fields = ["user__username", "task__title"]
    ordering = ["-created_at"]

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    add_form = UserCreationForm
    form = UserChangeForm
    model = User
    list_display = ['username', 'email', 'is_active']
    list_filter = ['email', 'is_staff', 'is_active']
    fieldsets = (
        (None, {'fields': ('email','username' ,'password')}),
        ('Permissions', {'fields': ('is_staff', 'is_active')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2', 'is_staff', 'is_active')}
         ),
    )
    search_fields = ('email',)
    ordering = ('email',)

@admin.register(Module)
class ModuleAdmin(admin.ModelAdmin):
    list_display = ['name', 'description', 'created_at', 'updated_at']
    search_fields = ['name', 'description']
    fields = ['name', 'description']
    list_filter = ['created_at', 'updated_at']
    ordering = ['created_at']

class ResursInline(admin.TabularInline):
    """Mavzu tahrirlanayotganda uning dars materiallari."""
    model = Resurs
    extra = 1
    fields = ["turi", "title", "url", "file", "order", "is_active"]
    ordering = ["order", "id"]


@admin.register(Mavzular)
class MavzularAdmin(admin.ModelAdmin):
    fields = ['name', 'module', 'description', 'is_active']
    list_display = ['name', 'module', 'description', 'is_active', 'slug']
    search_fields = ['name', 'description']
    list_filter = ['is_active', 'module', 'created_at', 'updated_at']
    ordering = ['created_at']
    list_editable = ['is_active']
    inlines = [ResursInline]

    def save_model(self, request, obj, form, change):
        # Faqat bitta mavzu faol bo'lishi mumkin:
        # yangisi "ochilganda" eskisi avtomatik yopiladi.
        if obj.is_active:
            Mavzular.objects.filter(is_active=True).exclude(pk=obj.pk).update(
                is_active=False
            )
        super().save_model(request, obj, form, change)

    def save_formset(self, request, form, formset, change):
        super().save_formset(request, form, formset, change)
        # Mavzu bilan birga qo'shilgan PDF'larning ko'rinishini yaratamiz
        for item in formset.forms:
            if item.instance and item.instance.pk:
                make_pdf_preview(item.instance)


@admin.register(Resurs)
class ResursAdmin(admin.ModelAdmin):
    list_display = ["title", "mavzu", "turi", "order", "is_active", "created_at"]
    list_filter = ["turi", "is_active", "mavzu__module"]
    search_fields = ["title", "description", "url"]
    ordering = ["mavzu", "order", "id"]
    list_editable = ["order", "is_active"]

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        make_pdf_preview(obj)


def make_pdf_preview(obj):
    """PDF resurs uchun birinchi sahifa ko‘rinishini yaratadi."""
    if getattr(obj, "turi", None) != "pdf" or not getattr(obj, "file", None):
        return
    if generate_pdf_preview(obj):
        obj.save(update_fields=["preview"])

import nested_admin
from django.db import transaction

import re

SEPARATOR = re.compile(r"\n\s*---\s*\n")

SAMPLE_DIAGRAM_HELP = (
    'Namuna blok-sxema (JSON): '
    '{"nodes": [{"id": 1, "type": "start", "x": 240, "y": 20, '
    '"text": "Boshlash"}], '
    '"edges": [{"from": 1, "to": 2, "fs": "b", "ts": "t"}]}. '
    "Blok turlari: start, io, calc, cond, end. "
    "Bo‘sh qoldirilsa, muharrir standart namunani ko‘rsatadi."
)


def split_tests(text):
    text = (text or "").replace("\r\n", "\n").strip()
    return [part.strip() for part in SEPARATOR.split(text)]


def next_test_order(task):
    """Topshiriqqa qo'shiladigan keyingi testning tartib raqami."""
    last = (
        TestCase.objects.filter(task=task)
        .order_by("-order")
        .values_list("order", flat=True)
        .first()
    )
    return (last or 0) + 1


def create_test_cases(task, inputs, outputs, start=1):
    """`start` tartib raqamidan boshlab test-case'larni ommaviy yaratadi."""
    if not inputs:
        return []
    return TestCase.objects.bulk_create([
        TestCase(
            task=task,
            input_data=input_data,
            expected_output=expected_output,
            order=start + n,
            is_sample=(start + n == 1),      # faqat eng birinchi test
        )
        for n, (input_data, expected_output) in enumerate(zip(inputs, outputs))
    ])


class AllTestsTextareaMixin(forms.ModelForm):
    """Bir nechta testni bitta matn maydonida `---` bilan kiritish.

    `TestCaseAdmin` ham, `AlgoritmVazifalarAdmin` ham shu formatdan
    foydalanadi: kirishlar va kutilgan natijalar bir xil tartibda,
    qator boshidagi `---` bilan ajratiladi.
    """

    all_inputs = forms.CharField(
        label="Barcha testlarning kirish ma’lumotlari",
        widget=forms.Textarea(attrs={
            "rows": 14,
            "style": "width: 100%; font-family: monospace;",
            "placeholder": (
                "15\n27\n"
                "---\n"
                "8\n3\n"
                "---\n"
                "-5\n-2"
            ),
        }),
        help_text=(
            "Har bir testni yangi qatordagi --- bilan ajrating."
        ),
        required=False,
    )

    all_outputs = forms.CharField(
        label="Barcha testlarning kutilgan natijalari",
        widget=forms.Textarea(attrs={
            "rows": 10,
            "style": "width: 100%; font-family: monospace;",
            "placeholder": "27\n---\n8\n---\n-2",
        }),
        help_text=(
            "Har bir test natijasini --- bilan ajrating. "
            "Kirish testlari bilan soni teng bo‘lishi kerak."
        ),
        required=False,
    )

    # False bo'lsa, ikkala maydon ham bo'sh qoldirilishi mumkin.
    tests_required = True

    def get_tests(self):
        """Tahrirlanayotgan obyektga tegishli mavjud testlar (queryset)."""
        raise NotImplementedError

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        if not self.instance.pk:
            return

        tests = list(self.get_tests())

        self.fields["all_inputs"].initial = "\n---\n".join(
            test.input_data for test in tests
        )
        self.fields["all_outputs"].initial = "\n---\n".join(
            test.expected_output for test in tests
        )

    def clean(self):
        cleaned_data = super().clean()

        inputs_text = cleaned_data.get("all_inputs", "")
        outputs_text = cleaned_data.get("all_outputs", "")

        # Ixtiyoriy holat: ikkala maydon ham bo'sh bo'lsa, tekshiruvsiz o'tadi.
        if not self.tests_required and not inputs_text.strip() and not outputs_text.strip():
            return cleaned_data

        if not inputs_text.strip() or not outputs_text.strip():
            raise forms.ValidationError(
                "Kirish ma’lumotlari va kutilgan natijalarni kiriting."
            )

        inputs = split_tests(inputs_text)
        outputs = split_tests(outputs_text)

        if len(inputs) != len(outputs):
            raise forms.ValidationError(
                f"Kirishlar soni ({len(inputs)}) va natijalar soni "
                f"({len(outputs)}) teng bo‘lishi kerak."
            )

        if any(not item for item in inputs):
            raise forms.ValidationError("Bo‘sh kirish testi mavjud.")

        if any(not item for item in outputs):
            raise forms.ValidationError("Bo‘sh kutilgan natija mavjud.")

        cleaned_data["parsed_inputs"] = inputs
        cleaned_data["parsed_outputs"] = outputs
        return cleaned_data


class TestCaseAdminForm(AllTestsTextareaMixin):
    class Meta:
        model = TestCase
        fields = ["task", "is_sample"]

    def get_tests(self):
        task = self.instance.task
        if not task:
            return TestCase.objects.none()
        return TestCase.objects.filter(task=task).order_by("order", "id")


@admin.register(TestCase)
class TestCaseAdmin(admin.ModelAdmin):
    form = TestCaseAdminForm
    list_display = ["task", "order", "input_data", "expected_output", "is_sample"]
    list_filter = ["task", "is_sample"]
    search_fields = ["input_data", "expected_output"]

    def save_model(self, request, obj, form, change):
        task = form.cleaned_data["task"]
        inputs = form.cleaned_data["parsed_inputs"]
        outputs = form.cleaned_data["parsed_outputs"]

        with transaction.atomic():
            if change:
                TestCase.objects.filter(task=task).exclude(pk=obj.pk).delete()
                start = 1
            else:
                start = next_test_order(task)

            # Birinchi test — admin bergan obyektning o'zi
            obj.task = task
            obj.input_data = inputs[0]
            obj.expected_output = outputs[0]
            obj.order = start
            obj.is_sample = (start == 1)      # faqat eng birinchi test
            super().save_model(request, obj, form, change)

            # Qolganlari: hech qachon sample emas
            create_test_cases(task, inputs[1:], outputs[1:], start=start + 1)

class TestVariantlariInline(nested_admin.NestedTabularInline):
    model = TestVariantlari
    fk_name = "topshiriq"
    fields = ["text", "is_correct"]
    extra = 1


class TestSavollarInline(nested_admin.NestedTabularInline):
    model = TestSavollar
    fields = ["text"]
    extra = 1
    inlines = [TestVariantlariInline]


class YozmavazifalarInline(nested_admin.NestedStackedInline):
    model = Yozmavazifalar
    fields = ["text"]
    extra = 1
    max_num = 1


class ProgrammingVazifalarInline(nested_admin.NestedStackedInline):
    model = ProgrammingVazifalar
    fields = [
        "time_limit",
        "memory_limit",
        "input_variables",
        "output_variables",
    ]
    extra = 1
    max_num = 1


@admin.register(TestSavollar)
class TestSavollarAdmin(nested_admin.NestedModelAdmin):
    list_display = ["text", "topshiriq", "slug"]
    search_fields = ["text"]
    inlines = [TestVariantlariInline]


@admin.register(TestVariantlari)
class TestVariantlariAdmin(admin.ModelAdmin):
    list_display = ["text", "topshiriq", "is_correct"]
    list_filter = ["is_correct"]
    search_fields = ["text"]


@admin.register(Topshiriqlar)
class TopshiriqlarAdmin(nested_admin.NestedModelAdmin):
    list_display = [
        "title",
        "mavzu",
        "turi",
        "max_score",
        "slug",
        "created_at",
    ]
    search_fields = ["title", "description"]
    fields = [
        "title",
        "description",
        "mavzu",
        "turi",
        "max_score",
    ]
    list_filter = ["turi", "mavzu", "created_at"]
    ordering = ["created_at"]

    inlines = [
        TestSavollarInline,
        YozmavazifalarInline,
        ProgrammingVazifalarInline,
    ]

    class Media:
        js = ("admin/topshiriq_form.js",)
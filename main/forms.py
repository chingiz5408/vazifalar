# forms.py

from django import forms
from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.core.exceptions import ValidationError


class CustomLoginForm(forms.Form):
    email = forms.EmailField(
        label="Elektron pochta",
        widget=forms.EmailInput(attrs={
            "id": "email",
            "autocomplete": "email",
            "placeholder": "siz@example.com",
        }),
    )

    password = forms.CharField(
        label="Parol",
        strip=False,
        widget=forms.PasswordInput(attrs={
            "id": "password",
            "autocomplete": "current-password",
            "placeholder": "Parolingizni kiriting",
        }),
    )

    def __init__(self, request=None, *args, **kwargs):
        self.request = request
        self.user_cache = None
        super().__init__(*args, **kwargs)

    def clean(self):
        cleaned_data = super().clean()
        email = cleaned_data.get("email")
        password = cleaned_data.get("password")

        if not email or not password:
            return cleaned_data

        User = get_user_model()

        try:
            user = User.objects.get(email__iexact=email)
        except (User.DoesNotExist, User.MultipleObjectsReturned):
            raise ValidationError(
                "Elektron pochta yoki parol noto‘g‘ri."
            )

        self.user_cache = authenticate(
            request=self.request,
            username=user.get_username(),
            password=password,
        )

        if self.user_cache is None:
            raise ValidationError(
                "Elektron pochta yoki parol noto‘g‘ri."
            )

        return cleaned_data

    def get_user(self):
        return self.user_cache


class RunCodeForm(forms.Form):
    """`RunCodeView` uchun kiruvchi ma'lumotlar (kod va topshiriq slug'i)."""

    code = forms.CharField(
        error_messages={"required": "Kod kiriting."},
    )
    task = forms.CharField(
        error_messages={"required": "Topshiriq aniqlanmadi."},
    )

    def clean_code(self):
        code = self.cleaned_data["code"]
        max_size = settings.CODE_RUNNER_MAX_CODE_SIZE
        if len(code) > max_size:
            raise ValidationError(
                f"Kod {max_size:,} belgidan oshmasligi kerak.".replace(",", " ")
            )
        return code

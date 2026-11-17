"""Talaba kabineti view'lari."""

from django.contrib.auth.mixins import LoginRequiredMixin
from django.views.generic import TemplateView

from ..services.dashboard import get_student_dashboard


class TalabaDashBoard(LoginRequiredMixin, TemplateView):
    login_url = "login"
    template_name = "Oquvchi.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context.update(get_student_dashboard(self.request.user))
        return context


class TopshiriqlarView(LoginRequiredMixin, TemplateView):
    login_url = "login"
    template_name = "Topshiriqlar.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context.update(get_student_dashboard(self.request.user))
        return context

"""Topshiriq sahifasi view'lari (test / programming / algorithm)."""

from django.contrib.auth.mixins import LoginRequiredMixin
from django.views.generic import TemplateView

from ..models import Topshiriqlar
from ..services import nazorat as nazorat_service
from ..services.tasks import (
    get_algorithm_workspace,
    get_programming_workspace,
    get_task_for_detail,
    get_test_questions,
)

# Topshiriq turi -> shablon
TASK_TEMPLATES = {
    "programming": "Kod_yozish_muharriri.html",
    "test": "Test muharriri.html",
    "theory": "nazariy.html",
    "algorithm": "Algoritm_muharriri.html",
}
DEFAULT_TASK_TEMPLATE = "task_detail.html"


class TaskDetailView(LoginRequiredMixin, TemplateView):
    login_url = "login"

    def get_task(self):
        """Topshiriqni bir marta oladi (shablon va kontekst uchun bir xil obyekt)."""
        if not hasattr(self, "_task"):
            self._task = get_task_for_detail(self.kwargs.get("slug"))
        return self._task

    def get_template_names(self):
        task = self.get_task()
        return [TASK_TEMPLATES.get(task.turi, DEFAULT_TASK_TEMPLATE)]

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        task = self.get_task()
        context["task"] = task
        context["nazorat"] = nazorat_service.holat(task, self.request.user)

        if task.turi == Topshiriqlar.TopshiriqTuri.TEST:
            context["savollar"] = get_test_questions(task)
        elif task.turi == Topshiriqlar.TopshiriqTuri.PROGRAMMING:
            context.update(get_programming_workspace(self.request.user, task))
        elif task.turi == Topshiriqlar.TopshiriqTuri.ALGORITHM:
            context.update(get_algorithm_workspace(self.request.user, task))

        return context

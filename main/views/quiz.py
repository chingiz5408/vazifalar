"""Test topshiriqlari view'lari."""

from django.contrib.auth.mixins import LoginRequiredMixin
from django.http import JsonResponse
from django.views import View
from django.views.generic import TemplateView

from ..services.quiz import get_test_task, submit_test
from ..services.tasks import get_task_for_detail, get_test_questions


class TestniBoshlash(LoginRequiredMixin, TemplateView):
    login_url = "login"
    template_name = "test.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        task = get_task_for_detail(self.kwargs.get("slug"))
        context["task"] = task
        context["savollar"] = get_test_questions(task)
        return context


class TestResultView(LoginRequiredMixin, View):
    login_url = "login"

    def post(self, request, *args, **kwargs):
        task = get_test_task(kwargs.get("slug"))
        result = submit_test(request.user, task, request.POST.getlist("answer"))

        return JsonResponse({"status": "success", **result})

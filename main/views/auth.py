"""Autentifikatsiya va bosh sahifa view'lari."""

from django.contrib.auth import logout
from django.contrib.auth.views import LoginView
from django.shortcuts import redirect
from django.urls import reverse_lazy
from django.views import View
from django.views.generic import TemplateView

from ..forms import CustomLoginForm


class HomeView(TemplateView):
    template_name = "index.html"


class CustomLoginView(LoginView):
    template_name = "Login.html"
    authentication_form = CustomLoginForm
    redirect_authenticated_user = True

    def get_success_url(self):
        if self.request.user.is_staff:
            return reverse_lazy("admin:index")
        return reverse_lazy("user_dashboard")


class CustomLogoutView(View):
    def post(self, request):
        logout(request)
        return redirect("login")

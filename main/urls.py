from django.urls import path

from .views import (
    CustomLoginView,
    CustomLogoutView,
    HomeView,
    RunCodeView,
    TalabaDashBoard,
    TaskDetailView,
    TestniBoshlash,
    TestResultView,
    TopshiriqlarView,
    AlgorithmNatija,
)

urlpatterns = [
    path("login/", CustomLoginView.as_view(), name="login"),
    path("logout/", CustomLogoutView.as_view(), name="logout"),
    path("talaba_dashboard/", TalabaDashBoard.as_view(), name="user_dashboard"),
    path("topshiriqlar/", TopshiriqlarView.as_view(), name="topshiriqlar"),
    path("tasks/<slug:slug>/", TaskDetailView.as_view(), name="tasks"),
    path("test/<slug:slug>/", TestniBoshlash.as_view(), name="test_start"),
    path("kod_run/", RunCodeView.as_view(), name="kod_run"),
    path("test/<slug:slug>/result/", TestResultView.as_view(), name="test_result"),
    path("algorithm_submit/<slug:slug>/", AlgorithmNatija.as_view(), name="algorithm_submit"),
    path("", HomeView.as_view(), name="index"),
]

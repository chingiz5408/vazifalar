"""View'lar paketi.

Har bir modul alohida sahifa guruhiga javob beradi:

- `auth`        — bosh sahifa, login/logout
- `dashboard`   — talaba kabineti va topshiriqlar ro'yxati
- `tasks`       — topshiriq sahifasi
- `quiz`        — test topshiriqlari
- `submissions` — kod yuborish (AJAX)

Barcha view'lar shu yerdan qayta eksport qilinadi, shuning uchun
`from .views import ...` ko'rinishidagi eski importlar ham ishlaydi.
"""

from .auth import CustomLoginView, CustomLogoutView, HomeView
from .dashboard import TalabaDashBoard, TopshiriqlarView
from .nazorat import NazoratView
from .quiz import TestniBoshlash, TestResultView
from .submissions import RunCodeView,AlgorithmNatija
from .tasks import TaskDetailView

__all__ = [
    "CustomLoginView",
    "CustomLogoutView",
    "HomeView",
    "RunCodeView",
    "TalabaDashBoard",
    "NazoratView",
    "TaskDetailView",
    "TestResultView",
    "TestniBoshlash",
    "TopshiriqlarView",
    "AlgorithmNatija",
]

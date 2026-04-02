from django.urls import path
from .views import IndiceIPCView, IndiceICLView, HistorialIndicesView

urlpatterns = [
    path('indices/ipc/',       IndiceIPCView.as_view(),       name='indice-ipc'),
    path('indices/icl/',       IndiceICLView.as_view(),       name='indice-icl'),
    path('indices/historial/', HistorialIndicesView.as_view(), name='indice-historial'),
]

from django.urls import path
from .views import IndiceIPCView, IndiceICLView, IndiceICLHistoricoView, HistorialIndicesView, IndiceCPView

urlpatterns = [
    path('indices/ipc/',          IndiceIPCView.as_view(),          name='indice-ipc'),
    path('indices/icl/',          IndiceICLView.as_view(),          name='indice-icl'),
    path('indices/icl-historico/', IndiceICLHistoricoView.as_view(), name='indice-icl-historico'),
    path('indices/casa-propia/',  IndiceCPView.as_view(),           name='indice-casa-propia'),
    path('indices/historial/',    HistorialIndicesView.as_view(),   name='indice-historial'),
]

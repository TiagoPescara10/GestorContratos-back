from django.db import models


class HistorialIndice(models.Model):
    """Registro de cada consulta a la API de índices."""
    tipo      = models.CharField(max_length=10)   # 'IPC' | 'ICL'
    valor     = models.DecimalField(max_digits=10, decimal_places=4)
    anterior  = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    fecha     = models.CharField(max_length=20, blank=True)   # ej: "2024-03"
    consultadoEn = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-consultadoEn']
        verbose_name = 'Historial de Índice'
        verbose_name_plural = 'Historial de Índices'

    def __str__(self):
        return f"{self.tipo} {self.valor}% ({self.fecha})"

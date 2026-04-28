from django.db import models


class IndiceIPC(models.Model):
    anio                = models.IntegerField()
    mes                 = models.IntegerField()  # 1-12
    porcentaje          = models.DecimalField(max_digits=10, decimal_places=2)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('anio', 'mes')
        ordering        = ['anio', 'mes']
        verbose_name        = 'Índice IPC'
        verbose_name_plural = 'Índices IPC'

    def __str__(self):
        return f"IPC {self.anio}/{self.mes:02d}: {self.porcentaje}%"


class IndiceICL(models.Model):
    anio                = models.IntegerField()
    mes                 = models.IntegerField()  # 1-12
    nivel               = models.DecimalField(max_digits=10, decimal_places=4)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('anio', 'mes')
        ordering        = ['anio', 'mes']
        verbose_name        = 'Índice ICL'
        verbose_name_plural = 'Índices ICL'

    def __str__(self):
        return f"ICL {self.anio}/{self.mes:02d}: {self.nivel}"


class IndiceCP(models.Model):
    anio                = models.IntegerField()
    mes                 = models.IntegerField()  # 1-12
    nivel               = models.DecimalField(max_digits=10, decimal_places=4)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('anio', 'mes')
        ordering        = ['anio', 'mes']
        verbose_name        = 'Índice Casa Propia'
        verbose_name_plural = 'Índices Casa Propia'

    def __str__(self):
        return f"CP {self.anio}/{self.mes:02d}: {self.nivel}"


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

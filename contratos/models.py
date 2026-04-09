from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone


class TipoPropiedad(models.TextChoices):
    LOCAL        = 'local',        'Local'
    OFICINA      = 'oficina',      'Oficina'
    DEPARTAMENTO = 'departamento', 'Departamento'
    CASA         = 'casa',         'Casa'


class TipoAumentoChoice(models.TextChoices):
    IPC             = 'IPC',             'IPC'
    ICL             = 'ICL',             'ICL'
    CASA_PROPIA     = 'casa_propia',     'Casa Propia'
    PORCENTAJE_FIJO = 'porcentaje_fijo', 'Porcentaje Fijo'
    MONTO_FIJO      = 'monto_fijo',      'Monto Fijo'


class EstadoPago(models.TextChoices):
    PENDIENTE = 'pendiente', 'Pendiente'
    PAGADO    = 'pagado',    'Pagado'
    PARCIAL   = 'parcial',   'Parcial'


class TipoAumentoHistorico(models.TextChoices):
    IPC             = 'IPC',             'IPC'
    ICL             = 'ICL',             'ICL'
    CASA_PROPIA     = 'casa_propia',     'Casa Propia'
    PORCENTAJE_FIJO = 'porcentaje_fijo', 'Porcentaje Fijo'
    MONTO_FIJO      = 'monto_fijo',      'Monto Fijo'
    MORA            = 'mora',            'Mora'


class Contrato(models.Model):
    @property
    def aumentos_aplicados(self):
        """
        Devuelve una lista de dicts con año y mes donde se aplicó un aumento.
        Ejemplo: [{'anio': 2025, 'mes': 6}, ...]
        """
        return [
            {'anio': m.anio, 'mes': m.mes + 1}
            for m in self.meses.filter(aumento_aplicado=True)
        ]

    # Propiedad
    pais          = models.CharField(max_length=100)
    provincia     = models.CharField(max_length=100)
    localidad     = models.CharField(max_length=100)
    codigoPostal  = models.CharField(max_length=20, blank=True, default='')
    tipoPropiedad = models.CharField(max_length=20, choices=TipoPropiedad.choices)

    # Inquilino
    inquilinoNombre   = models.CharField(max_length=150)
    inquilinoDni      = models.CharField(max_length=20)
    inquilinoTelefono = models.CharField(max_length=20, blank=True, null=True)

    # Propietario
    propietarioNombre          = models.CharField(max_length=150)
    propietarioDni             = models.CharField(max_length=20)
    propietarioTelefono        = models.CharField(max_length=20, blank=True, null=True)
    propietarioCbu             = models.CharField(max_length=22, blank=True, null=True)
    propietarioNombreCompleto  = models.CharField(max_length=200)
    propietarioCobraEn         = models.CharField(max_length=100, blank=True, null=True)
    propietarioCondicionFiscal = models.CharField(max_length=100, blank=True, null=True)
    propietarioEmail           = models.EmailField()
    propietarioAlias           = models.CharField(max_length=50, blank=True, null=True)
    propietarioNecesitaFactura = models.BooleanField(default=False)
    propietarioCuit            = models.CharField(max_length=20, blank=True, null=True)

    # Garante
    garanteNombre   = models.CharField(max_length=150, blank=True, null=True)
    garanteDni      = models.CharField(max_length=20,  blank=True, null=True)
    garanteTelefono = models.CharField(max_length=20,  blank=True, null=True)
    garanteDocumentoTipo = models.CharField(max_length=50, blank=True, null=True)
    garanteDocumentoArchivo = models.CharField(max_length=255, blank=True, null=True)

    # Términos financieros
    valorMensual     = models.DecimalField(max_digits=12, decimal_places=2)
    monedaMensual    = models.CharField(max_length=10, default='ARS')
    valorDeposito    = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    monedaDeposito   = models.CharField(max_length=10, blank=True, null=True)
    honorarios       = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    tipoInteresMora  = models.CharField(max_length=20, blank=True, null=True)
    valorInteresMora = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    # Temporal
    fechaInicio = models.DateField()
    fechaFin    = models.DateField()
    diaPago     = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(31)])
    duracion    = models.IntegerField(editable=False, default=0)

    # Ajustes
    frecuenciaAumento     = models.CharField(max_length=20, blank=True, null=True)
    tipoAumento           = models.CharField(max_length=20, choices=TipoAumentoChoice.choices, blank=True, null=True)

    # Ajustes / configuración del contrato
    incluye_iva = models.BooleanField(default=False)
    porcentaje_iva = models.DecimalField(max_digits=5, decimal_places=2, default=21)

    # Extras y adjunto
    conceptosExtras       = models.JSONField(default=list, blank=True)
    valorConceptosExtras  = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    contratoPdf           = models.FileField(upload_to='contratos/pdf/', null=True, blank=True)

    # Soft delete
    eliminado   = models.BooleanField(default=False)
    eliminadoEn = models.DateTimeField(null=True, blank=True)

    # Metadatos
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-createdAt']
        verbose_name = 'Contrato'
        verbose_name_plural = 'Contratos'

    def __str__(self):
        return f"#{self.pk} {self.inquilinoNombre} — {self.localidad}"

    @property
    def estado(self):
        hoy = timezone.localdate()
        if hoy < self.fechaInicio:
            return 'proxAvencer'
        if hoy > self.fechaFin:
            return 'vencido'
        if (self.fechaFin - hoy).days <= 30:
            return 'proxAvencer'
        return 'activo'

    @property
    def dias_restantes(self):
        return (self.fechaFin - timezone.localdate()).days

    def save(self, *args, **kwargs):
        from dateutil.relativedelta import relativedelta
        delta = relativedelta(self.fechaFin, self.fechaInicio)
        self.duracion = delta.years * 12 + delta.months
        super().save(*args, **kwargs)


class EstadoMensual(models.Model):
    contrato         = models.ForeignKey(Contrato, on_delete=models.CASCADE, related_name='meses')
    mes              = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(11)])
    anio             = models.IntegerField()
    estado           = models.CharField(max_length=20, choices=EstadoPago.choices, default=EstadoPago.PENDIENTE)
    montoBase        = models.DecimalField(max_digits=12, decimal_places=2)
    montoFinal       = models.DecimalField(max_digits=12, decimal_places=2)
    iva              = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    honorarios       = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    cargosAdicionales = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    tieneRecargo     = models.BooleanField(default=False)
    aumento_aplicado = models.BooleanField(default=False)
    mora_aplicada    = models.BooleanField(default=False)
    dias_atraso      = models.IntegerField(default=0)
    recargo_mora     = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    fecha_aplicacion_mora = models.DateTimeField(null=True, blank=True)


    createdAt        = models.DateTimeField(auto_now_add=True)
    updatedAt        = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('contrato', 'mes', 'anio')
        ordering = ['anio', 'mes']
        verbose_name = 'Estado Mensual'
        verbose_name_plural = 'Estados Mensuales'

    def __str__(self):
        NOMBRES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
        return f"{NOMBRES[self.mes]} {self.anio} [{self.estado}]"

    @property
    def fecha_vencimiento(self):
        """Fecha en que vence el pago de este mes."""
        from datetime import date
        import calendar
        ultimo = calendar.monthrange(self.anio, self.mes + 1)[1]
        dia = min(self.contrato.diaPago, ultimo)
        return date(self.anio, self.mes + 1, dia)

    @property
    def tiene_recargo_calculado(self):
        if self.estado == EstadoPago.PAGADO:
            return False
        from datetime import date
        hoy = date.today()
        mes_num = self.mes + 1  # mes 0-indexed → 1-indexed
        if self.anio < hoy.year or (self.anio == hoy.year and mes_num < hoy.month):
            return True
        if self.anio == hoy.year and mes_num == hoy.month:
            return hoy.day > self.contrato.diaPago
        return False


class AumentoMensual(models.Model):
    estadoMensual     = models.ForeignKey(EstadoMensual, on_delete=models.CASCADE, related_name='aumentos')
    tipoAumento       = models.CharField(max_length=20, choices=TipoAumentoHistorico.choices)
    indiceAnterior    = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)
    indiceNuevo       = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)
    porcentajeAumento = models.DecimalField(max_digits=8, decimal_places=4)
    montoAnterior     = models.DecimalField(max_digits=12, decimal_places=2)
    montoNuevo        = models.DecimalField(max_digits=12, decimal_places=2)
    razon             = models.CharField(max_length=255, blank=True, default='')
    aplicadoEn        = models.DateTimeField(auto_now_add=True)
    aplicadoPor       = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        ordering = ['aplicadoEn']
        verbose_name = 'Aumento Mensual'
        verbose_name_plural = 'Aumentos Mensuales'

    def __str__(self):
        return f"{self.tipoAumento} +{self.porcentajeAumento}% → {self.estadoMensual}"

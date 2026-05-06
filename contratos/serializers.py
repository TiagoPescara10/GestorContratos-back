from rest_framework import serializers
from django.utils import timezone
from .models import Contrato, EstadoMensual, AumentoMensual


class AumentoMensualSerializer(serializers.ModelSerializer):
    class Meta:
        model = AumentoMensual
        fields = '__all__'
        read_only_fields = ('aplicadoEn',)


class EstadoMensualSerializer(serializers.ModelSerializer):
    aumentos               = AumentoMensualSerializer(many=True, read_only=True)
    tieneRecargo           = serializers.SerializerMethodField()
    fecha_vencimiento      = serializers.SerializerMethodField()
    nombreMes              = serializers.SerializerMethodField()

    class Meta:
        model = EstadoMensual
        fields = '__all__'
        read_only_fields = ('contrato', 'createdAt', 'updatedAt')

    def get_tieneRecargo(self, obj):
        return obj.tiene_recargo_calculado

    def get_fecha_vencimiento(self, obj):
        return obj.fecha_vencimiento

    def get_nombreMes(self, obj):
        MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                 'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
        return MESES[obj.mes]


class EstadoMensualUpdateSerializer(serializers.Serializer):
    estado = serializers.ChoiceField(choices=['pendiente', 'pagado', 'parcial'])


class ContratoListSerializer(serializers.ModelSerializer):
    estado         = serializers.ReadOnlyField()
    dias_restantes = serializers.ReadOnlyField()
    frecuenciaAumento = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = Contrato
        fields = [
            'id', 'usuario', 'inquilinoNombre', 'inquilinoDni',
            'propietarioNombre', 'localidad', 'provincia','direccion',
            'tipoPropiedad', 'valorMensual', 'monedaMensual',
            'fechaInicio', 'fechaFin', 'diaPago', 'duracion',
            'estado', 'dias_restantes', 'frecuenciaAumento', 'createdAt',
        ]


class ContratoDetailSerializer(serializers.ModelSerializer):
    estado         = serializers.ReadOnlyField()
    dias_restantes = serializers.ReadOnlyField()
    meses          = EstadoMensualSerializer(many=True, read_only=True)
    valorConceptosExtras = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    frecuenciaAumento = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    garantes          = serializers.JSONField(default=list, required=False)
    contratoImagenes  = serializers.JSONField(default=list, required=False)
    contratoAnexos    = serializers.JSONField(default=list, required=False)

    aumentos_aplicados = serializers.ReadOnlyField()

    def validate_garantes(self, value):
        import json
        if isinstance(value, str):
            try:
                value = json.loads(value)
            except (ValueError, TypeError):
                raise serializers.ValidationError("garantes debe ser un JSON válido.")
        if not isinstance(value, list):
            raise serializers.ValidationError("garantes debe ser una lista.")

        # En edición, preservar documentoArchivo existente si el cliente no lo reenvió
        if self.instance:
            anteriores = self.instance.garantes or []
            for i, garante in enumerate(value):
                if not garante.get('documentoArchivo') and i < len(anteriores):
                    garante['documentoArchivo'] = anteriores[i].get('documentoArchivo')

        return value

    class Meta:
        model = Contrato
        exclude = ('eliminado', 'eliminadoEn')
        read_only_fields = ('duracion', 'createdAt', 'updatedAt', 'usuario')
        # valorConceptosExtras se incluye automáticamente por el campo declarado arriba

    def validate(self, data):
        fecha_inicio = data.get('fechaInicio', getattr(self.instance, 'fechaInicio', None))
        fecha_fin    = data.get('fechaFin',    getattr(self.instance, 'fechaFin', None))
        if fecha_inicio and fecha_fin and fecha_fin <= fecha_inicio:
            raise serializers.ValidationError(
                {'fechaFin': 'La fecha de fin debe ser posterior a la fecha de inicio.'}
            )
        necesita_factura = data.get(
            'propietarioNecesitaFactura',
            getattr(self.instance, 'propietarioNecesitaFactura', False)
        )
        if necesita_factura:
            cuit = data.get('propietarioCuit', getattr(self.instance, 'propietarioCuit', None))
            cf   = data.get('propietarioCondicionFiscal',
                            getattr(self.instance, 'propietarioCondicionFiscal', None))
            if not cuit:
                raise serializers.ValidationError(
                    {'propietarioCuit': 'Requerido cuando el propietario necesita factura.'}
                )
            if not cf:
                raise serializers.ValidationError(
                    {'propietarioCondicionFiscal': 'Requerida cuando el propietario necesita factura.'}
                )
        return data

# ── Serializers de acciones ───────────────────────────────────────────────────

_MAPA_TIPO_AUMENTO = {
    'ipc':             'IPC',
    'icl':             'ICL',
    'casa_propia':     'casa_propia',
    'porcentaje_fijo': 'porcentaje_fijo',
    'monto_fijo':      'monto_fijo',
}


class AplicarAumentoSerializer(serializers.Serializer):
    tipoAumento    = serializers.CharField()
    porcentajeFijo = serializers.DecimalField(max_digits=8, decimal_places=4,
                                              required=False, allow_null=True)
    montoFijo      = serializers.DecimalField(max_digits=12, decimal_places=2,
                                              required=False, allow_null=True)
    mesDesde       = serializers.IntegerField(min_value=1, max_value=12, required=False)
    anioDesde      = serializers.IntegerField(required=False)
    aplicadoPor    = serializers.CharField(max_length=100, required=False, allow_blank=True)

    def validate_tipoAumento(self, value):
        normalizado = value.lower()
        if normalizado not in _MAPA_TIPO_AUMENTO:
            raise serializers.ValidationError(
                f'Tipo de aumento inválido: "{value}". '
                f'Válidos: {list(_MAPA_TIPO_AUMENTO.keys())}'
            )
        return _MAPA_TIPO_AUMENTO[normalizado]

    def validate(self, data):
        tipo = data.get('tipoAumento')

        if tipo == 'porcentaje_fijo' and not data.get('porcentajeFijo'):
            raise serializers.ValidationError(
                {'porcentajeFijo': 'Requerido cuando tipoAumento es porcentaje_fijo.'}
            )

        if tipo == 'monto_fijo' and not data.get('montoFijo'):
            raise serializers.ValidationError(
                {'montoFijo': 'Requerido cuando tipoAumento es monto_fijo.'}
            )

        return data


class ConfirmarAumentoSerializer(serializers.Serializer):
    tipoAumento       = serializers.CharField()
    porcentajeAumento = serializers.DecimalField(max_digits=8, decimal_places=4)
    montoFijo         = serializers.DecimalField(max_digits=12, decimal_places=2,
                                                 required=False, allow_null=True)
    indiceAnterior    = serializers.DecimalField(max_digits=12, decimal_places=4,
                                                 required=False, allow_null=True)
    indiceNuevo       = serializers.DecimalField(max_digits=12, decimal_places=4,
                                                 required=False, allow_null=True)
    mesDesde          = serializers.IntegerField(min_value=1, max_value=12, required=False)
    anioDesde         = serializers.IntegerField(required=False)
    razon             = serializers.CharField(max_length=300, required=False, allow_blank=True)
    aplicadoPor       = serializers.CharField(max_length=100, required=False, allow_blank=True)

    def validate_tipoAumento(self, value):
        normalizado = value.lower()
        if normalizado not in _MAPA_TIPO_AUMENTO:
            raise serializers.ValidationError(
                f'Tipo de aumento inválido: "{value}". '
                f'Válidos: {list(_MAPA_TIPO_AUMENTO.keys())}'
            )
        return _MAPA_TIPO_AUMENTO[normalizado]


class AplicarMoraSerializer(serializers.Serializer):
    mes = serializers.IntegerField(min_value=1, max_value=12, required=False)
    anio = serializers.IntegerField(required=False)
    diasAtraso = serializers.IntegerField(min_value=0, required=False)
    recargoMora = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    aplicadoPor = serializers.CharField(max_length=100, required=False, allow_blank=True)

    def to_internal_value(self, data):
        if hasattr(data, 'copy'):
            data = data.copy()
        else:
            data = dict(data)

        if 'dias_atraso' in data and 'diasAtraso' not in data:
            data['diasAtraso'] = data['dias_atraso']
        if 'recargo_mora' in data and 'recargoMora' not in data:
            data['recargoMora'] = data['recargo_mora']

        return super().to_internal_value(data)

    def validate(self, data):
        campos_mes = ('mes', 'anio', 'diasAtraso', 'recargoMora')
        presentes = [campo for campo in campos_mes if campo in data]

        if presentes and len(presentes) != len(campos_mes):
            raise serializers.ValidationError(
                'Para aplicar mora a un mes específico se requieren mes, anio, diasAtraso y recargoMora.'
            )

        return data


class ReciboSerializer(serializers.Serializer):
    mes              = serializers.CharField(max_length=20)
    anio             = serializers.IntegerField()
    montoAlquiler    = serializers.DecimalField(max_digits=12, decimal_places=2)
    totalExtras      = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=0)
    conceptosExtras  = serializers.ListField(child=serializers.DictField(), required=False, default=list)
    honorariosPct    = serializers.DecimalField(max_digits=5, decimal_places=2)
    recargoMora     = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True, default=0)
    diasAtraso      = serializers.IntegerField(required=False, allow_null=True, default=0)
    tipoInteresMora = serializers.CharField(max_length=50, required=False, allow_blank=True, default='')
    valorInteresMora = serializers.DecimalField(max_digits=6, decimal_places=2, required=False, allow_null=True, default=0)

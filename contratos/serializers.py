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
    frecuenciaAumento = serializers.CharField(read_only=True)

    class Meta:
        model = Contrato
        fields = [
            'id', 'inquilinoNombre', 'inquilinoDni',
            'propietarioNombre', 'localidad', 'provincia',
            'tipoPropiedad', 'valorMensual', 'monedaMensual',
            'fechaInicio', 'fechaFin', 'diaPago', 'duracion',
            'estado', 'dias_restantes', 'frecuenciaAumento', 'createdAt',
        ]


class ContratoDetailSerializer(serializers.ModelSerializer):
    estado         = serializers.ReadOnlyField()
    dias_restantes = serializers.ReadOnlyField()
    meses          = EstadoMensualSerializer(many=True, read_only=True)
    valorConceptosExtras = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    frecuenciaAumento = serializers.CharField(read_only=True)

    class Meta:
        model = Contrato
        exclude = ('eliminado', 'eliminadoEn')
        read_only_fields = ('duracion', 'createdAt', 'updatedAt')
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

    def validate_inquilinoDni(self, value):
        qs = Contrato.objects.filter(inquilinoDni=value, eliminado=False)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                'Ya existe un contrato activo con este DNI de inquilino.'
            )
        return value


# ── Serializers de acciones ───────────────────────────────────────────────────

class AplicarAumentoSerializer(serializers.Serializer):
    tipoAumento    = serializers.ChoiceField(choices=['IPC', 'ICL', 'casa_propia', 'porcentaje_fijo', 'monto_fijo'])
    porcentajeFijo = serializers.DecimalField(max_digits=8, decimal_places=4,
                                              required=False, allow_null=True)
    montoFijo      = serializers.DecimalField(max_digits=12, decimal_places=2,
                                              required=False, allow_null=True)
    mesDesde       = serializers.IntegerField(min_value=1, max_value=12, required=False)
    anioDesde      = serializers.IntegerField(required=False)
    aplicadoPor    = serializers.CharField(max_length=100, required=False, allow_blank=True)

    def validate(self, data):
        tipo = data.get('tipoAumento')

        if tipo in ('porcentaje_fijo', 'casa_propia') and not data.get('porcentajeFijo'):
            raise serializers.ValidationError(
                {'porcentajeFijo': 'Requerido cuando tipoAumento es porcentaje_fijo o casa_propia.'}
            )

        if tipo == 'monto_fijo' and not data.get('montoFijo'):
            raise serializers.ValidationError(
                {'montoFijo': 'Requerido cuando tipoAumento es monto_fijo.'}
            )

        return data


class ConfirmarAumentoSerializer(serializers.Serializer):
    tipoAumento       = serializers.ChoiceField(choices=['IPC', 'ICL', 'casa_propia', 'porcentaje_fijo', 'monto_fijo'])
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


class AplicarMoraSerializer(serializers.Serializer):
    aplicadoPor = serializers.CharField(max_length=100, required=False, allow_blank=True)

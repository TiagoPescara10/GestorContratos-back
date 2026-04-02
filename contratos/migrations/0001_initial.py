# Generated manually

from django.db import migrations, models
import django.core.validators
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='Contrato',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('pais', models.CharField(max_length=100)),
                ('provincia', models.CharField(max_length=100)),
                ('localidad', models.CharField(max_length=100)),
                ('codigoPostal', models.CharField(blank=True, default='', max_length=20)),
                ('tipoPropiedad', models.CharField(choices=[('local', 'Local'), ('oficina', 'Oficina'), ('departamento', 'Departamento'), ('casa', 'Casa')], max_length=20)),
                ('inquilinoNombre', models.CharField(max_length=150)),
                ('inquilinoDni', models.CharField(max_length=20)),
                ('inquilinoTelefono', models.CharField(blank=True, max_length=20, null=True)),
                ('propietarioNombre', models.CharField(max_length=150)),
                ('propietarioDni', models.CharField(max_length=20)),
                ('propietarioTelefono', models.CharField(blank=True, max_length=20, null=True)),
                ('propietarioCbu', models.CharField(blank=True, max_length=22, null=True)),
                ('propietarioNombreCompleto', models.CharField(max_length=200)),
                ('propietarioCobraEn', models.CharField(blank=True, max_length=100, null=True)),
                ('propietarioCondicionFiscal', models.CharField(blank=True, max_length=100, null=True)),
                ('propietarioEmail', models.EmailField(max_length=254)),
                ('propietarioAlias', models.CharField(blank=True, max_length=50, null=True)),
                ('propietarioNecesitaFactura', models.BooleanField(default=False)),
                ('propietarioCuit', models.CharField(blank=True, max_length=20, null=True)),
                ('garanteNombre', models.CharField(blank=True, max_length=150, null=True)),
                ('garanteDni', models.CharField(blank=True, max_length=20, null=True)),
                ('garanteTelefono', models.CharField(blank=True, max_length=20, null=True)),
                ('valorMensual', models.DecimalField(decimal_places=2, max_digits=12)),
                ('monedaMensual', models.CharField(default='ARS', max_length=10)),
                ('valorDeposito', models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ('monedaDeposito', models.CharField(blank=True, max_length=10, null=True)),
                ('honorarios', models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ('tipoInteresMora', models.CharField(blank=True, max_length=20, null=True)),
                ('valorInteresMora', models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ('fechaInicio', models.DateField()),
                ('fechaFin', models.DateField()),
                ('diaPago', models.IntegerField(validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(31)])),
                ('duracion', models.IntegerField(default=0, editable=False)),
                ('frecuenciaAumento', models.CharField(blank=True, max_length=20, null=True)),
                ('tipoAumento', models.CharField(blank=True, choices=[('IPC', 'IPC'), ('ICL', 'ICL'), ('porcentaje_fijo', 'Porcentaje Fijo')], max_length=20, null=True)),
                ('conceptosExtras', models.JSONField(blank=True, default=list)),
                ('contratoPdf', models.FileField(blank=True, null=True, upload_to='contratos/pdf/')),
                ('eliminado', models.BooleanField(default=False)),
                ('eliminadoEn', models.DateTimeField(blank=True, null=True)),
                ('createdAt', models.DateTimeField(auto_now_add=True)),
                ('updatedAt', models.DateTimeField(auto_now=True)),
            ],
            options={'ordering': ['-createdAt'], 'verbose_name': 'Contrato', 'verbose_name_plural': 'Contratos'},
        ),
        migrations.CreateModel(
            name='EstadoMensual',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('mes', models.IntegerField(validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(11)])),
                ('anio', models.IntegerField()),
                ('estado', models.CharField(choices=[('pendiente', 'Pendiente'), ('pagado', 'Pagado'), ('parcial', 'Parcial')], default='pendiente', max_length=20)),
                ('montoBase', models.DecimalField(decimal_places=2, max_digits=12)),
                ('montoFinal', models.DecimalField(decimal_places=2, max_digits=12)),
                ('iva', models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ('honorarios', models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ('cargosAdicionales', models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ('tieneRecargo', models.BooleanField(default=False)),
                ('createdAt', models.DateTimeField(auto_now_add=True)),
                ('updatedAt', models.DateTimeField(auto_now=True)),
                ('contrato', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='meses', to='contratos.contrato')),
            ],
            options={'ordering': ['anio', 'mes'], 'verbose_name': 'Estado Mensual', 'verbose_name_plural': 'Estados Mensuales'},
        ),
        migrations.CreateModel(
            name='AumentoMensual',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tipoAumento', models.CharField(choices=[('IPC', 'IPC'), ('ICL', 'ICL'), ('porcentaje_fijo', 'Porcentaje Fijo'), ('mora', 'Mora')], max_length=20)),
                ('indiceAnterior', models.DecimalField(blank=True, decimal_places=4, max_digits=12, null=True)),
                ('indiceNuevo', models.DecimalField(blank=True, decimal_places=4, max_digits=12, null=True)),
                ('porcentajeAumento', models.DecimalField(decimal_places=4, max_digits=8)),
                ('montoAnterior', models.DecimalField(decimal_places=2, max_digits=12)),
                ('montoNuevo', models.DecimalField(decimal_places=2, max_digits=12)),
                ('razon', models.CharField(blank=True, default='', max_length=255)),
                ('aplicadoEn', models.DateTimeField(auto_now_add=True)),
                ('aplicadoPor', models.CharField(blank=True, max_length=100, null=True)),
                ('estadoMensual', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='aumentos', to='contratos.estadomensual')),
            ],
            options={'ordering': ['aplicadoEn'], 'verbose_name': 'Aumento Mensual', 'verbose_name_plural': 'Aumentos Mensuales'},
        ),
        migrations.AddConstraint(
            model_name='estadomensual',
            constraint=models.UniqueConstraint(fields=('contrato', 'mes', 'anio'), name='unique_contrato_mes_anio'),
        ),
    ]

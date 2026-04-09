from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('contratos', '0004_estadomensual_aumento_aplicado'),
    ]

    operations = [
        migrations.AddField(
            model_name='contrato',
            name='garanteDocumentoArchivo',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='contrato',
            name='garanteDocumentoTipo',
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
        migrations.AddField(
            model_name='estadomensual',
            name='dias_atraso',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='estadomensual',
            name='fecha_aplicacion_mora',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='estadomensual',
            name='mora_aplicada',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='estadomensual',
            name='recargo_mora',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True),
        ),
    ]
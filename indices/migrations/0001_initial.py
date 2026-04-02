from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True
    dependencies = []

    operations = [
        migrations.CreateModel(
            name='HistorialIndice',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('tipo', models.CharField(max_length=10)),
                ('valor', models.DecimalField(decimal_places=4, max_digits=10)),
                ('anterior', models.DecimalField(blank=True, decimal_places=4, max_digits=10, null=True)),
                ('fecha', models.CharField(blank=True, max_length=20)),
                ('consultadoEn', models.DateTimeField(auto_now_add=True)),
            ],
            options={'ordering': ['-consultadoEn'], 'verbose_name': 'Historial de Índice', 'verbose_name_plural': 'Historial de Índices'},
        ),
    ]

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('indices', '0005_add_indice_icl'),
    ]

    operations = [
        migrations.CreateModel(
            name='IndiceCP',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('anio', models.IntegerField()),
                ('mes', models.IntegerField()),
                ('nivel', models.DecimalField(decimal_places=4, max_digits=10)),
                ('fecha_actualizacion', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Índice Casa Propia',
                'verbose_name_plural': 'Índices Casa Propia',
                'ordering': ['anio', 'mes'],
                'unique_together': {('anio', 'mes')},
            },
        ),
    ]

# Generated manually for data migration

from django.db import migrations

def assign_existing_contracts(apps, schema_editor):
    """
    Assign all existing contracts to the current user (giordanoconti@inmobiliaria.com)
    """
    Contrato = apps.get_model('contratos', 'Contrato')
    Usuario = apps.get_model('usuarios', 'Usuario')
    
    try:
        # Get the current user
        usuario_actual = Usuario.objects.get(email='giordanoconti@inmobiliaria.com')
        
        # Assign all existing contracts to this user
        contracts_updated = Contrato.objects.filter(usuario__isnull=True).update(usuario=usuario_actual)
        
        print(f"Assigned {contracts_updated} existing contracts to user {usuario_actual.email}")
        
    except Usuario.DoesNotExist:
        print("ERROR: User giordanoconti@inmobiliaria.com not found!")
        # Create the user if it doesn't exist
        usuario_actual = Usuario.objects.create_user(
            email='giordanoconti@inmobiliaria.com',
            username='giordanoconti',
            first_name='GiordanoConti',
            last_name='Inmobiliaria',
            password='giorconti2026$'
        )
        
        contracts_updated = Contrato.objects.filter(usuario__isnull=True).update(usuario=usuario_actual)
        print(f"Created user and assigned {contracts_updated} existing contracts")

def reverse_assign_existing_contracts(apps, schema_editor):
    """
    Reverse migration: Set usuario to null for all contracts
    """
    Contrato = apps.get_model('contratos', 'Contrato')
    Contrato.objects.all().update(usuario=None)

class Migration(migrations.Migration):

    dependencies = [
        ('contratos', '0012_contrato_usuario'),
    ]

    operations = [
        migrations.RunPython(assign_existing_contracts, reverse_assign_existing_contracts),
    ]

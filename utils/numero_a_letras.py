from num2words import num2words


def convertir_a_letras(numero):
    """
    Convierte un número a letras en español y mayúsculas.
    
    Args:
        numero (int/float/Decimal): Número a convertir
        
    Returns:
        str: Número en letras en mayúsculas
        
    Example:
        >>> convertir_a_letras(578496)
        'QUINIENTOS SETENTA Y OCHO MIL CUATROCIENTOS NOVENTA Y SEIS'
    """
    from decimal import Decimal
    
    if not isinstance(numero, (int, float, Decimal)):
        raise ValueError("El número debe ser de tipo int, float o Decimal")
    
    # Convertir Decimal a float para num2words
    if isinstance(numero, Decimal):
        numero = float(numero)
    
    if numero < 0:
        raise ValueError("El número debe ser positivo")
    
    # Convertir a entero si es decimal sin parte fraccionaria
    if isinstance(numero, float) and numero.is_integer():
        numero = int(numero)
    
    # Convertir a letras usando locale 'es'
    letras = num2words(numero, lang='es')
    
    # Convertir a mayúsculas
    return letras.upper()


def convertir_monto_a_letras(monto):
    """
    Convierte un monto monetario a letras en español.
    
    Args:
        monto (int/float): Monto a convertir
        
    Returns:
        str: Monto en letras en mayúsculas
        
    Example:
        >>> convertir_monto_a_letras(578496)
        'QUINIENTOS SETENTA Y OCHO MIL CUATROCIENTOS NOVENTA Y SEIS'
    """
    return convertir_a_letras(monto)

#!/usr/bin/env python3
"""
Script para verificar que el deployment está funcionando correctamente
"""
import os
import sys
import requests
from django.core.management import execute_from_command_line

def check_backend_health():
    """Verificar que el backend está respondiendo"""
    try:
        response = requests.get('https://gestor-contratos-backend.onrender.com/api/schema/', timeout=10)
        if response.status_code == 200:
            print("Backend API: OK")
            return True
        else:
            print(f"Backend API: ERROR (Status {response.status_code})")
            return False
    except requests.exceptions.RequestException as e:
        print(f"Backend API: ERROR ({e})")
        return False

def check_frontend_health():
    """Verificar que el frontend está respondiendo"""
    try:
        response = requests.get('https://gestor-contratos.vercel.app/', timeout=10)
        if response.status_code == 200:
            print("Frontend: OK")
            return True
        else:
            print(f"Frontend: ERROR (Status {response.status_code})")
            return False
    except requests.exceptions.RequestException as e:
        print(f"Frontend: ERROR ({e})")
        return False

def check_cors():
    """Verificar configuración CORS"""
    try:
        response = requests.options(
            'https://gestor-contratos-backend.onrender.com/api/auth/login/',
            headers={
                'Origin': 'https://gestor-contratos.vercel.app',
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'Content-Type,Authorization'
            },
            timeout=10
        )
        
        cors_headers = {
            'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
            'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
            'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers')
        }
        
        if cors_headers['Access-Control-Allow-Origin'] == 'https://gestor-contratos.vercel.app':
            print("CORS: OK")
            print(f"CORS Headers: {cors_headers}")
            return True
        else:
            print("CORS: ERROR")
            print(f"CORS Headers: {cors_headers}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"CORS: ERROR ({e})")
        return False

def check_login_endpoint():
    """Verificar endpoint de login"""
    try:
        response = requests.post(
            'https://gestor-contratos-backend.onrender.com/api/auth/login/',
            json={'email': 'test@example.com', 'password': 'test123'},
            timeout=10
        )
        
        if response.status_code == 400:
            print("Login endpoint: OK (responds 400 for invalid credentials)")
            return True
        elif response.status_code == 405:
            print("Login endpoint: ERROR (Method not allowed)")
            return False
        else:
            print(f"Login endpoint: Responding with status {response.status_code}")
            return True
    except requests.exceptions.RequestException as e:
        print(f"Login endpoint: ERROR ({e})")
        return False

def main():
    print("=== Verificación de Deploy ===")
    print("Verificando que todo esté funcionando correctamente...\n")
    
    checks = [
        ("Backend Health", check_backend_health),
        ("Frontend Health", check_frontend_health),
        ("CORS Configuration", check_cors),
        ("Login Endpoint", check_login_endpoint)
    ]
    
    results = []
    for name, check_func in checks:
        print(f"Verificando {name}...")
        result = check_func()
        results.append((name, result))
        print()
    
    print("=== Resumen ===")
    all_ok = True
    for name, result in results:
        status = "OK" if result else "ERROR"
        print(f"{name}: {status}")
        if not result:
            all_ok = False
    
    if all_ok:
        print("\n¡Todo está funcionando correctamente! El deployment debería funcionar.")
    else:
        print("\nHay problemas que necesitan ser solucionados.")
    
    return 0 if all_ok else 1

if __name__ == '__main__':
    sys.exit(main())

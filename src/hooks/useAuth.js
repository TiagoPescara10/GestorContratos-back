import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import apiFetch from '../api/client'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  // Check authentication status on mount
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    const storedUser = localStorage.getItem('user')
    
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser))
        setIsAuthenticated(true)
      } catch (error) {
        clearAuthData()
      }
    }
    setLoading(false)
  }, [])

  const clearAuthData = useCallback(() => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    localStorage.removeItem('recordarUsuario')
  }, [])

  const login = useCallback(async (credentials) => {
    const { usuario, password, recordar } = credentials
    
    // Simple validation
    if (!usuario.trim() || !password.trim()) {
      throw new Error('Por favor completa todos los campos')
    }

    try {
      // Try real API authentication first
      const response = await apiFetch('auth/login/', {
        method: 'POST',
        body: {
          email: usuario,
          password: password
        }
      })

      const { access, refresh, user: userData } = response
      
      // Store tokens and user data FIRST
      localStorage.setItem('access_token', access)
      localStorage.setItem('refresh_token', refresh)
      localStorage.setItem('user', JSON.stringify(userData))
      
      if (recordar) {
        localStorage.setItem('recordarUsuario', usuario)
      }
      
      // Update state AFTER storing data
      setUser(userData)
      setIsAuthenticated(true)
      
      return true
    } catch (error) {
      // Fallback to demo mode for development
      if (import.meta.env.DEV && usuario === 'admin@inmobiliaria.com' && password === 'password123') {
        const demoUser = {
          id: 1,
          username: usuario,
          email: 'admin@example.com',
          first_name: 'Admin',
          last_name: 'User'
        }
        
        // Store demo session FIRST
        localStorage.setItem('user', JSON.stringify(demoUser))
        localStorage.setItem('access_token', 'demo_token_' + Date.now())
        
        if (recordar) {
          localStorage.setItem('recordarUsuario', usuario)
        }
        
        // Update state AFTER storing data
        setUser(demoUser)
        setIsAuthenticated(true)
        
        return true
      }
      
      throw new Error(error.message || 'Usuario o contraseña incorrectos')
    }
  }, [])

  const logout = useCallback(() => {
    clearAuthData()
    setUser(null)
    setIsAuthenticated(false)
    navigate('/login')
  }, [navigate, clearAuthData])

  const refreshToken = useCallback(async () => {
    const refresh = localStorage.getItem('refresh_token')
    if (!refresh) {
      throw new Error('No refresh token available')
    }

    try {
      const response = await apiFetch('auth/refresh/', {
        method: 'POST',
        body: { refresh }
      })

      const { access } = response
      localStorage.setItem('access_token', access)
      return access
    } catch (error) {
      // Refresh failed, logout user
      logout()
      throw error
    }
  }, [logout])

  const checkAuth = useCallback(() => {
    const token = localStorage.getItem('access_token')
    const storedUser = localStorage.getItem('user')
    
    if (token && storedUser && !isAuthenticated) {
      try {
        setUser(JSON.parse(storedUser))
        setIsAuthenticated(true)
        return true
      } catch (error) {
        clearAuthData()
      }
    }
    return isAuthenticated
  }, [isAuthenticated, clearAuthData])

  return {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    checkAuth,
    refreshToken
  }
}

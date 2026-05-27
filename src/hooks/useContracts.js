import { useState, useEffect, useCallback } from 'react'
import { getContratos, deleteContrato } from '../api/contratos'

export function useContracts() {
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const loadContracts = useCallback(async (options = {}) => {
    setLoading(true)
    setError(null)
    
    try {
      const data = await getContratos({ page_size: 200, ...options })
      setContracts(data.results || data)
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los contratos')
      console.error('Error loading contracts:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteContract = useCallback(async (id) => {
    try {
      await deleteContrato(id)
      await loadContracts()
      return true
    } catch (err) {
      setError(err.message || 'No se pudo eliminar el contrato')
      console.error('Error deleting contract:', err)
      return false
    }
  }, [loadContracts])

  const refreshContracts = useCallback(() => {
    loadContracts()
  }, [loadContracts])

  useEffect(() => {
    loadContracts()
  }, [loadContracts])

  return {
    contracts,
    loading,
    error,
    loadContracts,
    deleteContract,
    refreshContracts
  }
}

import { useState, useCallback } from 'react'
import { useApiError } from './useApiError'

export function useAsyncOperation() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { handleError } = useApiError()

  const execute = useCallback(async (asyncFn, options = {}) => {
    const {
      showLoading = true,
      showError = true,
      errorMessage = 'Ocurrió un error inesperado',
      onSuccess,
      onError
    } = options

    if (showLoading) {
      setLoading(true)
    }
    setError(null)

    try {
      const result = await asyncFn()
      
      if (onSuccess) {
        onSuccess(result)
      }
      
      return result
    } catch (err) {
      setError(err)
      
      if (showError) {
        handleError(err, { title: errorMessage })
      }
      
      if (onError) {
        onError(err)
      }
      
      throw err
    } finally {
      if (showLoading) {
        setLoading(false)
      }
    }
  }, [handleError])

  const reset = useCallback(() => {
    setLoading(false)
    setError(null)
  }, [])

  return {
    loading,
    error,
    execute,
    reset
  }
}

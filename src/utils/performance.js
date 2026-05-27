// Performance optimization utilities

// Debounce function for search inputs and API calls
export function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// Throttle function for scroll events and animations
export function throttle(func, limit) {
  let inThrottle
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// Memoization helper for expensive calculations
export function memoize(fn) {
  const cache = new Map()
  return function(...args) {
    const key = JSON.stringify(args)
    if (cache.has(key)) {
      return cache.get(key)
    }
    const result = fn.apply(this, args)
    cache.set(key, result)
    return result
  }
}

// Lazy loading helper for images and components
export function lazyLoad(element, callback) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        callback()
        observer.unobserve(element)
      }
    })
  })
  observer.observe(element)
}

// Performance monitoring
export function measurePerformance(name, fn) {
  return async function(...args) {
    const start = performance.now()
    const result = await fn.apply(this, args)
    const end = performance.now()
    return result
  }
}

// Cache API responses
export function createApiCache(maxAge = 5 * 60 * 1000) { // 5 minutes default
  const cache = new Map()
  
  return {
    get(key) {
      const item = cache.get(key)
      if (!item) return null
      
      if (Date.now() - item.timestamp > maxAge) {
        cache.delete(key)
        return null
      }
      
      return item.data
    },
    
    set(key, data) {
      cache.set(key, {
        data,
        timestamp: Date.now()
      })
    },
    
    clear() {
      cache.clear()
    }
  }
}

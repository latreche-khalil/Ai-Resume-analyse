import { useState, useEffect } from 'react'

export function useCounter(target: number, duration = 1500) {
  const [value, setValue] = useState(0)
  
  useEffect(() => {
    if (target === 0) return
    
    const steps = 60
    const inc = target / steps
    let cur = 0
    
    const timer = setInterval(() => {
      cur += inc
      if (cur >= target) {
        setValue(target)
        clearInterval(timer)
      } else {
        setValue(Math.floor(cur))
      }
    }, duration / steps)
    
    return () => clearInterval(timer)
  }, [target, duration])
  
  return value
}

import { useEffect, useState } from 'react'

export function useTypewriter(text: string, active: boolean, speedMs = 10) {
  const [displayed, setDisplayed] = useState(active ? '' : text)

  useEffect(() => {
    if (!active) {
      setDisplayed(text)
      return
    }

    setDisplayed('')
    let index = 0
    const timer = window.setInterval(() => {
      index += 1
      setDisplayed(text.slice(0, index))
      if (index >= text.length) {
        window.clearInterval(timer)
      }
    }, speedMs)

    return () => window.clearInterval(timer)
  }, [text, active, speedMs])

  return displayed
}

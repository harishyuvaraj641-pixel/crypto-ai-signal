import { useEffect, useRef, useState, useCallback } from 'react'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws'

export function useWebSocket() {
  const [connected, setConnected] = useState(false)
  const [prices, setPrices] = useState({})
  const [lastCandle, setLastCandle] = useState(null)
  const [latestSignal, setLatestSignal] = useState(null)
  const [serverTime, setServerTime] = useState(null)
  const wsRef = useRef(null)
  const reconnectTimer = useRef(null)

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      console.log('WS connected')
      // Start ping loop
      ws._pingTimer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }))
        }
      }, 25000)
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        switch (msg.type) {
          case 'prices':
            setPrices(prev => {
              const next = { ...prev }
              msg.data.forEach(p => { next[p.symbol] = p })
              return next
            })
            break
          case 'candle':
            setLastCandle(msg)
            break
          case 'signal':
            setLatestSignal(msg.data)
            break
          case 'api_partial':
            setLatestSignal({
              ...msg.data,
              is_partial: true,
              reason: msg.data.chunk,
              signal: 'STREAMING'
            })
            break
          case 'heartbeat':
          case 'pong':
            setServerTime(msg.server_time || new Date().toISOString())
            break
          default:
            break
        }
      } catch (e) {
        console.warn('WS parse error', e)
      }
    }

    ws.onclose = () => {
      setConnected(false)
      clearInterval(ws._pingTimer)
      console.log('WS disconnected, reconnecting in 3s…')
      reconnectTimer.current = setTimeout(connect, 3000)
    }

    ws.onerror = (e) => {
      console.error('WS error', e)
      ws.close()
    }
  }, [])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectTimer.current)
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
      }
    }
  }, [connect])

  return { connected, prices, lastCandle, latestSignal, serverTime }
}

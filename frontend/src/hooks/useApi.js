import { useState, useEffect, useCallback } from 'react'

const API = 'http://localhost:8000/api'

export function useApi() {
  const [providers, setProviders] = useState({})
  const [coins, setCoins] = useState([])
  const [signalHistory, setSignalHistory] = useState([])
  const [predictionActive, setPredictionActive] = useState(false)
  const [predictionStatus, setPredictionStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchProviders = useCallback(async () => {
    try {
      const r = await fetch(`${API}/providers`)
      setProviders(await r.json())
    } catch (e) { console.warn('providers fetch failed', e) }
  }, [])

  const fetchCoins = useCallback(async () => {
    try {
      const r = await fetch(`${API}/coins`)
      const data = await r.json()
      setCoins(data.coins || [])
    } catch (e) { console.warn('coins fetch failed', e) }
  }, [])

  const fetchSignals = useCallback(async (symbol = null) => {
    try {
      const url = symbol ? `${API}/signals?symbol=${symbol}&limit=50` : `${API}/signals?limit=50`
      const r = await fetch(url)
      const data = await r.json()
      setSignalHistory(data.signals || [])
    } catch (e) { console.warn('signals fetch failed', e) }
  }, [])

  const checkStatus = useCallback(async () => {
    try {
      const r = await fetch(`${API}/predict/status`)
      const data = await r.json()
      setPredictionStatus(data)
      setPredictionActive(data.active)
    } catch (e) { console.warn('status check failed', e) }
  }, [])

  const startPrediction = useCallback(async (config) => {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch(`${API}/predict/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (!r.ok) {
        const err = await r.json()
        throw new Error(err.detail || 'Failed to start prediction')
      }
      setPredictionActive(true)
      await checkStatus()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [checkStatus])

  const stopPrediction = useCallback(async () => {
    setLoading(true)
    try {
      await fetch(`${API}/predict/stop`, { method: 'POST' })
      setPredictionActive(false)
      setPredictionStatus(null)
    } catch (e) { console.warn('stop failed', e) }
    finally { setLoading(false) }
  }, [])

  const addCoin = useCallback(async (symbol) => {
    try {
      await fetch(`${API}/coins/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol }),
      })
      await fetchCoins()
    } catch (e) { console.warn('add coin failed', e) }
  }, [fetchCoins])

  const getCandles = useCallback(async (symbol, timeframe, limit = 100) => {
    try {
      const r = await fetch(`${API}/candles/${symbol}/${timeframe}?limit=${limit}`)
      const data = await r.json()
      return data.candles || []
    } catch (e) { return [] }
  }, [])

  const getIndicators = useCallback(async (symbol, timeframe) => {
    try {
      const r = await fetch(`${API}/indicators/${symbol}/${timeframe}`)
      return await r.json()
    } catch (e) { return null }
  }, [])

  useEffect(() => {
    fetchProviders()
    fetchCoins()
    fetchSignals()
    checkStatus()
  }, [fetchProviders, fetchCoins, fetchSignals, checkStatus])

  return {
    providers, coins, signalHistory, predictionActive, predictionStatus,
    loading, error, fetchSignals, startPrediction, stopPrediction,
    addCoin, getCandles, getIndicators,
  }
}

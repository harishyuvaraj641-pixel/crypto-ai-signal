import { useState, useEffect, useCallback } from 'react'
import Header from '../components/Header'
import LivePriceTable from '../components/LivePriceTable'
import CandleChart from '../components/CandleChart'
import SignalCard from '../components/SignalCard'
import CountdownTimers from '../components/CountdownTimers'
import SignalHistory from '../components/SignalHistory'
import ControlPanel from '../components/ControlPanel'
import IndicatorPanel from '../components/IndicatorPanel'
import { useWebSocket } from '../websocket/useWebSocket'
import { useApi } from '../hooks/useApi'

export default function Dashboard() {
  const [selectedCoin, setSelectedCoin] = useState('BTCUSDT')
  const [selectedTf, setSelectedTf] = useState('5m')
  const [indicators, setIndicators] = useState(null)
  const [allSignals, setAllSignals] = useState([])

  const { connected, prices, lastCandle, latestSignal, serverTime } = useWebSocket()
  const {
    providers, coins, signalHistory, predictionActive, loading, error,
    fetchSignals, startPrediction, stopPrediction, addCoin, getCandles, getIndicators,
  } = useApi()

  // Sync signal history
  useEffect(() => {
    setAllSignals(signalHistory)
  }, [signalHistory])

  // Prepend new signals from WS
  useEffect(() => {
    if (!latestSignal) return
    
    // Skip injecting live stream chunks into the static historical list
    if (!latestSignal.is_partial) {
      setAllSignals(prev => [latestSignal, ...prev.slice(0, 49)])
    }

    // Automatically reset prediction active state if the backend stopped due to an error
    if (latestSignal.api_failed || latestSignal.signal === 'ERROR') {
      stopPrediction()
    }
  }, [latestSignal, stopPrediction])

  // Load indicators when coin/tf changes
  const loadIndicators = useCallback(async () => {
    const ind = await getIndicators(selectedCoin, selectedTf)
    setIndicators(ind)
  }, [selectedCoin, selectedTf, getIndicators])

  useEffect(() => {
    loadIndicators()
    const t = setInterval(loadIndicators, 10000)
    return () => clearInterval(t)
  }, [loadIndicators])

  // Refresh signal history periodically
  useEffect(() => {
    const t = setInterval(() => fetchSignals(selectedCoin), 30000)
    return () => clearInterval(t)
  }, [fetchSignals, selectedCoin])

  // When coin changes, refresh signals
  useEffect(() => {
    fetchSignals(selectedCoin)
  }, [selectedCoin, fetchSignals])

  return (
    <div className="min-h-screen flex flex-col bg-dark-900">
      <Header connected={connected} serverTime={serverTime} />

      <main className="flex-1 max-w-[1920px] mx-auto w-full p-3 lg:p-4">
        {/* Countdown Bar */}
        <div className="mb-3">
          <CountdownTimers />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-12 gap-3 h-[calc(100vh-200px)] min-h-[600px]">

          {/* Left sidebar — price table */}
          <div className="col-span-12 md:col-span-2 flex flex-col">
            <LivePriceTable
              prices={prices}
              coins={coins.length ? coins : ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT']}
              selectedCoin={selectedCoin}
              onSelectCoin={setSelectedCoin}
              onAddCoin={addCoin}
            />
          </div>

          {/* Center — chart */}
          <div className="col-span-12 md:col-span-6 flex flex-col gap-3">
            <div className="flex-1 min-h-0">
              <CandleChart
                symbol={selectedCoin}
                timeframe={selectedTf}
                onTimeframeChange={setSelectedTf}
                getCandles={getCandles}
                lastCandle={lastCandle}
              />
            </div>
          </div>

          {/* Right sidebar — config + signal + indicators */}
          <div className="col-span-12 md:col-span-4 flex flex-col gap-3 overflow-y-auto">
            <ControlPanel
              providers={providers}
              coins={coins.length ? coins : ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT']}
              predictionActive={predictionActive}
              loading={loading}
              error={error}
              onStart={startPrediction}
              onStop={stopPrediction}
            />
            <SignalCard
              signal={latestSignal || (allSignals.length ? allSignals[0] : null)}
              predictionActive={predictionActive}
            />
            <IndicatorPanel indicators={indicators} />
          </div>
        </div>

        {/* Signal History — full width */}
        <div className="mt-3 h-64">
          <SignalHistory
            signals={allSignals}
            onRefresh={() => fetchSignals(selectedCoin)}
            selectedCoin={selectedCoin}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-3 flex items-center justify-between text-[10px] text-gray-700">
        <span>CryptoAI Signal v1.0 — For educational purposes only. Not financial advice.</span>
        <span className="flex items-center gap-2">
          <span className={connected ? 'text-buy' : 'text-gray-600'}>
            {connected ? '● WebSocket Connected' : '○ Disconnected'}
          </span>
          <span>·</span>
          <span>Binance Market Data</span>
        </span>
      </footer>
    </div>
  )
}

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, TimeScale,
  PointElement, LineElement, BarElement,
  Tooltip, Legend, Filler,
} from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'
import { BarChart2, RefreshCw } from 'lucide-react'

ChartJS.register(
  CategoryScale, LinearScale, TimeScale,
  PointElement, LineElement, BarElement,
  Tooltip, Legend, Filler,
)

const TIMEFRAMES = ['1m','2m','3m','4m','5m','10m','15m','30m','1h','4h','1d']

function formatTime(ts, tf) {
  const d = new Date(ts)
  if (tf === '1d') return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  if (tf === '4h' || tf === '1h') return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function CandleChart({ symbol, timeframe, onTimeframeChange, getCandles, lastCandle }) {
  const [candles, setCandles] = useState([])
  const [loading, setLoading] = useState(false)
  const prevSymbol = useRef(null)
  const prevTf = useRef(null)

  const loadCandles = useCallback(async () => {
    if (!symbol || !timeframe) return
    setLoading(true)
    const data = await getCandles(symbol, timeframe, 100)
    setCandles(data)
    setLoading(false)
  }, [symbol, timeframe, getCandles])

  useEffect(() => {
    if (symbol !== prevSymbol.current || timeframe !== prevTf.current) {
      prevSymbol.current = symbol
      prevTf.current = timeframe
      loadCandles()
    }
  }, [symbol, timeframe, loadCandles])

  // Update last candle from WS stream
  useEffect(() => {
    if (!lastCandle || lastCandle.symbol !== symbol || lastCandle.timeframe !== timeframe) return
    setCandles(prev => {
      if (!prev.length) return prev
      const c = lastCandle.data
      const last = prev[prev.length - 1]
      if (last.open_time === c.open_time) {
        return [...prev.slice(0, -1), c]
      }
      return [...prev.slice(-99), c]
    })
  }, [lastCandle, symbol, timeframe])

  const labels = candles.map(c => formatTime(c.open_time, timeframe))
  const closes = candles.map(c => c.close)
  const volumes = candles.map(c => c.volume)

  const isUp = closes.length >= 2 && closes[closes.length - 1] >= closes[closes.length - 2]
  const lineColor = isUp ? '#10B981' : '#EF4444'

  const priceData = {
    labels,
    datasets: [
      {
        label: `${symbol} Price`,
        data: closes,
        borderColor: lineColor,
        backgroundColor: isUp
          ? 'rgba(16,185,129,0.05)'
          : 'rgba(239,68,68,0.05)',
        borderWidth: 1.5,
        pointRadius: 0,
        pointHoverRadius: 4,
        fill: true,
        tension: 0.1,
      },
    ],
  }

  const volumeData = {
    labels,
    datasets: [
      {
        label: 'Volume',
        data: volumes,
        backgroundColor: candles.map((c, i) =>
          i === 0 || c.close >= c.open ? 'rgba(16,185,129,0.5)' : 'rgba(239,68,68,0.5)'
        ),
        borderWidth: 0,
      },
    ],
  }

  const priceOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1A2035',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        titleColor: '#9CA3AF',
        bodyColor: '#E5E7EB',
        callbacks: {
          label: ctx => ` $${Number(ctx.raw).toLocaleString('en-US', { maximumFractionDigits: 4 })}`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false },
        ticks: { color: '#6B7280', font: { size: 10, family: 'JetBrains Mono' }, maxTicksLimit: 8 },
      },
      y: {
        position: 'right',
        grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false },
        ticks: {
          color: '#6B7280', font: { size: 10, family: 'JetBrains Mono' },
          callback: v => `$${Number(v).toLocaleString('en-US', { maximumFractionDigits: 2 })}`,
        },
      },
    },
  }

  const volumeOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { display: false } },
    scales: {
      x: { display: false },
      y: {
        position: 'right',
        grid: { display: false },
        ticks: { color: '#6B7280', font: { size: 9 }, maxTicksLimit: 3,
          callback: v => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : v,
        },
      },
    },
  }

  const currentPrice = closes[closes.length - 1]

  return (
    <div className="glass-card flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BarChart2 size={14} className="text-accent-cyan" />
          <span className="font-semibold text-sm text-gray-200">{symbol}</span>
          {currentPrice && (
            <span className={`font-mono text-sm font-semibold ${isUp ? 'text-buy' : 'text-sell'}`}>
              ${currentPrice.toLocaleString('en-US', { maximumFractionDigits: currentPrice < 1 ? 6 : 2 })}
            </span>
          )}
        </div>

        {/* Timeframe picker */}
        <div className="flex items-center gap-1">
          {TIMEFRAMES.map(tf => (
            <button
              key={tf}
              onClick={() => onTimeframeChange(tf)}
              className={`px-2 py-1 rounded text-[10px] font-mono font-medium transition-all duration-150
                         ${timeframe === tf
                           ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/30'
                           : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
            >
              {tf}
            </button>
          ))}
          <button onClick={loadCandles} className="btn-ghost p-1.5 ml-1" title="Refresh">
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Chart area */}
      <div className="flex-1 flex flex-col p-3 gap-1 min-h-0">
        {candles.length > 0 ? (
          <>
            <div className="flex-1 min-h-0" style={{ height: '78%' }}>
              <Line data={priceData} options={priceOptions} />
            </div>
            <div style={{ height: '22%' }}>
              <Bar data={volumeData} options={volumeOptions} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
            {loading ? (
              <div className="flex items-center gap-2">
                <RefreshCw size={14} className="animate-spin text-accent-blue" />
                <span>Loading chart…</span>
              </div>
            ) : (
              <span>No chart data. Connecting to Binance…</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

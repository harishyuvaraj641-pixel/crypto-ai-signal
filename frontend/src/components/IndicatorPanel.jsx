import { Activity, TrendingUp, TrendingDown, Minus, BarChart2 } from 'lucide-react'

function Gauge({ value, min = 0, max = 100, label, low = 30, high = 70 }) {
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
  const color = value < low ? '#EF4444' : value > high ? '#10B981' : '#F59E0B'
  const angle = (pct / 100) * 180 - 90

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: 60, height: 32 }}>
        {/* Background arc */}
        <svg width={60} height={32} viewBox="0 0 60 32">
          <path d="M 5 30 A 25 25 0 0 1 55 30" fill="none"
                stroke="rgba(255,255,255,0.06)" strokeWidth="5" strokeLinecap="round" />
          <path d="M 5 30 A 25 25 0 0 1 55 30" fill="none"
                stroke={color} strokeWidth="5" strokeLinecap="round"
                strokeDasharray={`${pct * 0.785} 100`}
                style={{ filter: `drop-shadow(0 0 3px ${color}80)` }} />
        </svg>
        {/* Needle */}
        <div className="absolute bottom-1 left-1/2"
             style={{
               transformOrigin: 'bottom center',
               transform: `translateX(-50%) rotate(${angle}deg)`,
               width: 2,
               height: 16,
               background: `linear-gradient(to top, ${color}, transparent)`,
               borderRadius: 2,
               transition: 'transform 0.5s ease',
             }} />
      </div>
      <div className="text-center">
        <div className="font-mono text-sm font-bold" style={{ color }}>
          {value != null ? Number(value).toFixed(1) : '—'}
        </div>
        <div className="text-[9px] text-gray-600 uppercase tracking-wide">{label}</div>
      </div>
    </div>
  )
}

function IndRow({ label, value, unit = '', color = 'text-gray-300', decimals = 4 }) {
  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <span className={`stat-value ${color}`}>
        {value != null ? `${Number(value).toFixed(decimals)}${unit}` : '—'}
      </span>
    </div>
  )
}

function TrendBadge({ trend }) {
  const cfg = {
    UPTREND: { icon: TrendingUp, cls: 'badge-buy', label: '↑ UPTREND' },
    DOWNTREND: { icon: TrendingDown, cls: 'badge-sell', label: '↓ DOWNTREND' },
    SIDEWAYS: { icon: Minus, cls: 'badge-hold', label: '— SIDEWAYS' },
  }[trend] || { icon: Minus, cls: 'badge-hold', label: trend || '—' }

  const Icon = cfg.icon
  return <span className={cfg.cls}><Icon size={10} />{cfg.label}</span>
}

export default function IndicatorPanel({ indicators }) {
  if (!indicators) {
    return (
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity size={14} className="text-accent-cyan" />
          <h3 className="text-sm font-semibold text-gray-200">Technical Indicators</h3>
        </div>
        <div className="text-center py-8 text-gray-600 text-sm">
          Select a coin to see indicators
        </div>
      </div>
    )
  }

  const rsi = indicators.rsi
  const macd = indicators.macd
  const macdHist = indicators.macd_hist

  return (
    <div className="glass-card p-4 space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-accent-cyan" />
          <h3 className="text-sm font-semibold text-gray-200">Indicators</h3>
        </div>
        {indicators.trend && <TrendBadge trend={indicators.trend} />}
      </div>

      {/* Gauges row */}
      <div className="flex justify-around">
        <Gauge value={rsi} min={0} max={100} label="RSI" low={30} high={70} />
        <Gauge value={indicators.volatility} min={0} max={5} label="Volatility %" low={0.5} high={2} />
        <Gauge value={indicators.momentum} min={-10} max={10} label="Momentum" low={-2} high={2} />
      </div>

      {/* MACD bar */}
      <div className="bg-dark-800/60 rounded-lg p-3 border border-white/5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-gray-500 uppercase tracking-wide flex items-center gap-1">
            <BarChart2 size={10} />MACD
          </span>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-gray-500">
              Line: <span className={`font-mono font-medium ${macd > 0 ? 'text-buy' : 'text-sell'}`}>
                {macd != null ? Number(macd).toFixed(4) : '—'}
              </span>
            </span>
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold
              ${macdHist > 0 ? 'bg-buy/15 text-buy' : 'bg-sell/15 text-sell'}`}>
              {macdHist > 0 ? '▲ BULL' : '▼ BEAR'}
            </span>
          </div>
        </div>
        {/* Histogram bar */}
        <div className="relative h-6 bg-dark-900 rounded overflow-hidden">
          <div className="absolute inset-y-0 left-1/2 w-px bg-white/10" />
          {macdHist != null && (
            <div className="absolute inset-y-1 rounded"
                 style={{
                   background: macdHist > 0 ? '#10B981' : '#EF4444',
                   opacity: 0.6,
                   left: macdHist > 0 ? '50%' : `${50 - Math.min(48, Math.abs(macdHist * 200))}%`,
                   width: `${Math.min(48, Math.abs(macdHist * 200))}%`,
                 }} />
          )}
        </div>
      </div>

      {/* EMA / Price levels */}
      <div className="space-y-0.5">
        <IndRow label="EMA 9" value={indicators.ema9} />
        <IndRow label="EMA 21" value={indicators.ema21} />
        <IndRow label="EMA 50" value={indicators.ema50} />
        <IndRow label="SMA 20" value={indicators.sma20} />
      </div>

      {/* Support / Resistance */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-dark-800/60 rounded-lg p-2.5 border border-sell/15">
          <div className="text-[9px] text-gray-500 uppercase mb-1">Resistance</div>
          <div className="font-mono text-xs text-sell font-semibold">
            ${indicators.resistance ? Number(indicators.resistance).toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—'}
          </div>
        </div>
        <div className="bg-dark-800/60 rounded-lg p-2.5 border border-buy/15">
          <div className="text-[9px] text-gray-500 uppercase mb-1">Support</div>
          <div className="font-mono text-xs text-buy font-semibold">
            ${indicators.support ? Number(indicators.support).toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—'}
          </div>
        </div>
      </div>

      {/* Volume change */}
      <div className="stat-row">
        <span className="stat-label">Volume Change</span>
        <span className={`stat-value ${indicators.volume_change > 0 ? 'text-buy' : 'text-sell'}`}>
          {indicators.volume_change != null ? `${indicators.volume_change > 0 ? '+' : ''}${Number(indicators.volume_change).toFixed(1)}%` : '—'}
        </span>
      </div>
      {/* VWAP, ADX, StochRSI */}
      <div className="space-y-0.5 py-1">
        <IndRow label="VWAP" value={indicators.vwap} color="text-accent-purple" />
        <IndRow label="ADX (Trend Str)" value={indicators.adx} color="text-accent-yellow" decimals={2} />
        <IndRow label="StochRSI K" value={indicators.stochrsi_k} decimals={2} />
        <IndRow label="StochRSI D" value={indicators.stochrsi_d} decimals={2} />
      </div>

      {/* Bollinger Bands */}
      <div className="bg-dark-800/60 rounded-lg p-2.5 border border-white/5">
        <div className="text-[9px] text-gray-500 uppercase mb-1">Bollinger Bands</div>
        <div className="flex justify-between items-center text-[11px] font-mono">
          <div className="flex flex-col"><span className="text-[8px] text-gray-600">LOWER</span><span className="text-sell">${indicators.bb_lower ? Number(indicators.bb_lower).toFixed(2) : '—'}</span></div>
          <div className="flex flex-col items-center"><span className="text-[8px] text-gray-600">MID</span><span className="text-gray-400">${indicators.bb_mid ? Number(indicators.bb_mid).toFixed(2) : '—'}</span></div>
          <div className="flex flex-col items-end"><span className="text-[8px] text-gray-600">UPPER</span><span className="text-buy">${indicators.bb_upper ? Number(indicators.bb_upper).toFixed(2) : '—'}</span></div>
        </div>
      </div>

      <IndRow label="ATR" value={indicators.atr} />
    </div>
  )
}

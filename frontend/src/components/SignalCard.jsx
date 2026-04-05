import { useEffect, useRef } from 'react'
import { TrendingUp, TrendingDown, Minus, Zap, Clock, Target, AlertCircle, WifiOff, RefreshCw } from 'lucide-react'

function SignalRing({ confidence, signal }) {
  const size = 100
  const radius = 40
  const circ = 2 * Math.PI * radius
  const offset = circ - (confidence / 100) * circ
  const color = signal === 'BUY' ? '#10B981' : signal === 'SELL' ? '#EF4444' : '#F59E0B'

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none"
                stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
        <circle cx={size/2} cy={size/2} r={radius} fill="none"
                stroke={color} strokeWidth="8"
                strokeDasharray={circ} strokeDashoffset={offset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.4s ease',
                         filter: `drop-shadow(0 0 6px ${color}80)` }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-bold text-xl font-mono" style={{ color }}>{confidence}%</span>
        <span className="text-[9px] text-gray-500 uppercase tracking-wider">conf</span>
      </div>
    </div>
  )
}

/* ── API Failed banner ─────────────────────────────────────────────────────── */
function ApiFailedPanel({ signal }) {
  return (
    <div className="flex flex-col gap-3">
      {/* Icon + headline */}
      <div className="flex items-center gap-3 p-3 rounded-xl border border-red-500/30 bg-red-500/10">
        <div className="shrink-0 w-10 h-10 rounded-full bg-red-500/20 border border-red-500/40
                        flex items-center justify-center">
          <WifiOff size={18} className="text-red-400" />
        </div>
        <div>
          <div className="text-sm font-bold text-red-400 tracking-wide">API CALL FAILED</div>
          <div className="text-[10px] text-gray-500 font-mono mt-0.5">
            {signal.provider} / {signal.model?.split('/').pop()?.slice(0, 24)}
          </div>
        </div>
      </div>

      {/* Error message */}
      <div className="bg-dark-800/60 rounded-lg p-2.5 border border-red-500/20">
        <div className="flex items-center gap-1 mb-1.5">
          <AlertCircle size={10} className="text-red-400" />
          <span className="text-[9px] text-red-400/80 uppercase tracking-wide">Error Detail</span>
        </div>
        <p className="text-[11px] text-red-300/80 leading-relaxed font-mono break-all">
          {signal.error_message || signal.reason || 'Unknown API error'}
        </p>
      </div>

      {/* Meta */}
      <div className="flex items-center justify-between text-[10px] text-gray-600 font-mono">
        <span>{signal.symbol} · {signal.timeframe}</span>
        <span>{signal.created_at ? new Date(signal.created_at).toLocaleTimeString() : ''}</span>
      </div>

      <p className="text-[10px] text-gray-600 text-center">
        {signal.reason?.includes('market data') || signal.reason?.includes('Indicator') 
          ? 'Data is still loading from Binance. Please wait.' 
          : 'Check your API key / model name and try again.'}
      </p>
    </div>
  )
}

export default function SignalCard({ signal, predictionActive }) {
  const prevSignal = useRef(null)
  const cardRef = useRef(null)

  useEffect(() => {
    if (!signal || signal === prevSignal.current) return
    prevSignal.current = signal
    if (cardRef.current) {
      cardRef.current.classList.add('animate-fade-in')
      setTimeout(() => cardRef.current?.classList.remove('animate-fade-in'), 500)
    }
  }, [signal])

  const isApiFailed = signal?.api_failed === true || signal?.signal === 'ERROR'
  const isStreaming = signal?.signal === 'STREAMING'
  const signalType = isApiFailed ? 'HOLD' : (isStreaming ? 'HOLD' : (signal?.signal || 'HOLD'))
  const confidence = signal?.confidence || 0

  const { glowClass, bgClass } = isApiFailed
    ? { glowClass: 'shadow-[0_0_20px_rgba(239,68,68,0.1)]', bgClass: 'border-red-500/20 bg-red-500/5' }
    : isStreaming 
      ? { glowClass: 'shadow-[0_0_20px_rgba(6,182,212,0.15)]', bgClass: 'border-accent-cyan/30 bg-accent-cyan/5' }
      : ({
          BUY:  { glowClass: 'glow-buy',  bgClass: 'border-buy/30 bg-buy/5'   },
          SELL: { glowClass: 'glow-sell', bgClass: 'border-sell/30 bg-sell/5' },
          HOLD: { glowClass: 'glow-hold', bgClass: 'border-hold/30 bg-hold/5' },
        }[signalType] || { glowClass: 'glow-hold', bgClass: 'border-hold/30 bg-hold/5' })

  const textClass = isStreaming ? 'text-accent-cyan' : ({ BUY: 'text-buy', SELL: 'text-sell', HOLD: 'text-hold' }[signalType] || 'text-hold')

  const targetTimeStr = signal?.target_time 
    ? new Date(signal.target_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    : signal?.prediction_time || '—';

  const createdAtStr = signal?.created_at
    ? new Date(signal.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})
    : '';

  return (
    <div ref={cardRef} className={`glass-card border ${bgClass} ${glowClass} p-4 transition-all duration-500`}>
      {/* Title */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
          <Zap size={12} className="text-accent-yellow" />
          AI Signal
        </h3>
        {predictionActive && !isApiFailed && (
          <span className="flex items-center gap-1 text-[10px] text-buy font-medium">
            <span className="dot-live" />
            ANALYZING
          </span>
        )}
        {isApiFailed && (
          <span className="flex items-center gap-1 text-[10px] text-red-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
            FAILED
          </span>
        )}
      </div>

      {/* ── API failed state ── */}
      {isApiFailed ? (
        <ApiFailedPanel signal={signal} />
      ) : signal ? (
        <>
          {/* Main signal */}
          <div className="flex items-center gap-4 mb-4">
            <SignalRing confidence={confidence} signal={signalType} />
            <div>
              <div className={`text-4xl font-black tracking-tight ${textClass}`}
                   style={{ textShadow: `0 0 20px currentColor` }}>
                {isStreaming ? '...' : signalType}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {signal.symbol} · {signal.timeframe}
              </div>
              <div className="text-[10px] text-gray-600 font-mono mt-0.5">
                via {signal.provider} / {signal.model?.split('/').pop()?.slice(0, 20)}
              </div>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-dark-800/60 rounded-lg p-2.5 border border-white/5">
              <div className="flex items-center gap-1 mb-1">
                <Target size={10} className="text-accent-cyan" />
                <span className="text-[9px] text-gray-500 uppercase tracking-wide">Target Time</span>
              </div>
              <div className="text-xs font-medium text-gray-200 leading-tight">
                {targetTimeStr}
              </div>
            </div>
            <div className="bg-dark-800/60 rounded-lg p-2.5 border border-white/5">
              <div className="flex items-center gap-1 mb-1">
                <Clock size={10} className="text-accent-purple" />
                <span className="text-[9px] text-gray-500 uppercase tracking-wide">At Price</span>
              </div>
              <div className="font-mono text-xs font-semibold text-gray-200">
                ${signal.price ? Number(signal.price).toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—'}
              </div>
            </div>
          </div>

          {/* Reason */}
          <div className="bg-dark-800/40 rounded-lg p-2.5 border border-white/5 transition-all">
            <div className="flex items-center gap-1 mb-1.5">
              <AlertCircle size={10} className={isStreaming ? "text-accent-cyan" : "text-accent-yellow"} />
              <span className="text-[9px] text-gray-400 uppercase tracking-wide">
                {isStreaming ? 'Live AI Reasoning...' : 'AI Reasoning'}
              </span>
              {isStreaming && <RefreshCw size={10} className="ml-auto animate-spin text-accent-cyan" />}
            </div>
            <div className="max-h-32 overflow-y-auto custom-scrollbar pr-1">
              <p className={`text-[11px] leading-relaxed break-words whitespace-pre-wrap ${isStreaming ? 'text-gray-300 font-mono' : 'text-gray-300'}`}>
                {signal.reason || (isStreaming ? 'Listening for tokens' : '—')}
                {isStreaming && <span className="inline-block w-1.5 h-3 ml-0.5 align-middle bg-accent-cyan animate-pulse" />}
              </p>
            </div>
          </div>

          {/* Time */}
          <div className="mt-2.5 text-[10px] text-gray-500 text-right font-mono flex items-center justify-between">
            <span className="text-gray-600">Made At:</span>
            <span>{createdAtStr}</span>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <div className="w-16 h-16 rounded-full border-2 border-dashed border-white/10
                          flex items-center justify-center">
            <Zap size={24} className="text-gray-600" />
          </div>
          <p className="text-sm text-gray-600 text-center">
            {predictionActive
              ? 'Waiting for first prediction…'
              : 'Configure AI provider and start prediction'
            }
          </p>
        </div>
      )}
    </div>
  )
}

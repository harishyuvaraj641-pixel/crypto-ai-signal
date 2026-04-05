import { useEffect, useState } from 'react'
import { History, TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react'

const BADGE = {
  BUY:  <span className="badge-buy"><TrendingUp size={10} />BUY</span>,
  SELL: <span className="badge-sell"><TrendingDown size={10} />SELL</span>,
  HOLD: <span className="badge-hold"><Minus size={10} />HOLD</span>,
}

function ConfBar({ value }) {
  const color = value >= 75 ? '#10B981' : value >= 50 ? '#F59E0B' : '#EF4444'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-dark-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
             style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="font-mono text-[10px] text-gray-400 w-7 text-right">{value}%</span>
    </div>
  )
}

export default function SignalHistory({ signals, onRefresh, selectedCoin }) {
  const filtered = selectedCoin
    ? signals.filter(s => s.symbol === selectedCoin)
    : signals

  const buyCount = signals.filter(s => s.signal === 'BUY').length
  const sellCount = signals.filter(s => s.signal === 'SELL').length
  const holdCount = signals.filter(s => s.signal === 'HOLD').length

  return (
    <div className="glass-card flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <History size={14} className="text-accent-cyan" />
          <h2 className="text-sm font-semibold text-gray-200">Signal History</h2>
          <div className="flex items-center gap-2 ml-2">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-buy/10 text-buy border border-buy/20">
              {buyCount} BUY
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-sell/10 text-sell border border-sell/20">
              {sellCount} SELL
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-hold/10 text-hold border border-hold/20">
              {holdCount} HOLD
            </span>
          </div>
        </div>
        <button onClick={onRefresh} className="btn-ghost py-1 px-2" title="Refresh">
          <RefreshCw size={11} />
        </button>
      </div>

      {/* Table */}
      <div className="overflow-auto flex-1">
        {filtered.length > 0 ? (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-dark-800/90 backdrop-blur-sm">
              <tr className="text-[10px] text-gray-500 uppercase tracking-wider border-b border-white/5">
                <th className="text-left px-3 py-2 font-medium">Time</th>
                <th className="text-left px-3 py-2 font-medium">Symbol</th>
                <th className="text-left px-3 py-2 font-medium">TF</th>
                <th className="text-left px-3 py-2 font-medium">Signal</th>
                <th className="px-3 py-2 font-medium">Confidence</th>
                <th className="text-right px-3 py-2 font-medium hidden md:table-cell">Price</th>
                <th className="text-left px-3 py-2 font-medium hidden lg:table-cell">Provider</th>
                <th className="text-left px-3 py-2 font-medium hidden xl:table-cell">Target Time</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id}
                    className="border-b border-white/4 hover:bg-white/3 transition-colors duration-100 group">
                  <td className="px-3 py-2 font-mono text-[10px] text-gray-500">
                    {s.created_at ? new Date(s.created_at).toLocaleTimeString() : '—'}
                  </td>
                  <td className="px-3 py-2 font-semibold text-gray-300">{s.symbol}</td>
                  <td className="px-3 py-2 font-mono text-gray-500">{s.timeframe}</td>
                  <td className="px-3 py-2">{BADGE[s.signal] || BADGE.HOLD}</td>
                  <td className="px-3 py-2 w-28">
                    <ConfBar value={s.confidence} />
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-gray-400 hidden md:table-cell">
                    {s.price ? `$${Number(s.price).toLocaleString('en-US', { maximumFractionDigits: 2 })}` : '—'}
                  </td>
                  <td className="px-3 py-2 text-gray-500 hidden lg:table-cell capitalize">{s.provider}</td>
                  <td className="px-3 py-2 text-gray-600 hidden xl:table-cell text-[10px]">
                    {s.target_time ? new Date(s.target_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : (s.prediction_time || '—')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <History size={32} className="text-gray-700" />
            <p className="text-sm text-gray-600">No signals yet</p>
            <p className="text-xs text-gray-700">Start a prediction to see signals here</p>
          </div>
        )}
      </div>
    </div>
  )
}

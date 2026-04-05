import { useState, useEffect, useRef } from 'react'
import { TrendingUp, TrendingDown, Minus, Plus, Search } from 'lucide-react'

const COIN_COLORS = {
  BTC: '#F7931A', ETH: '#627EEA', BNB: '#F3BA2F',
  SOL: '#9945FF', XRP: '#00AAE4',
}

function getCoinBase(symbol) {
  return symbol.replace('USDT', '').replace('BUSD', '')
}

function PriceCell({ symbol, data, isSelected, onClick }) {
  const prevPrice = useRef(null)
  const [flash, setFlash] = useState(null)
  const base = getCoinBase(symbol)
  const price = data?.price || 0
  const open24h = data?.open_24h || price
  const change24h = open24h ? ((price - open24h) / open24h) * 100 : 0
  const isUp = change24h >= 0

  useEffect(() => {
    if (prevPrice.current !== null && prevPrice.current !== price) {
      setFlash(price > prevPrice.current ? 'up' : 'down')
      const t = setTimeout(() => setFlash(null), 600)
      prevPrice.current = price
      return () => clearTimeout(t)
    }
    prevPrice.current = price
  }, [price])

  return (
    <tr
      onClick={onClick}
      className={`cursor-pointer transition-all duration-150 border-b border-white/5
                  ${isSelected ? 'bg-accent-blue/10' : 'hover:bg-white/3'}
                  ${flash === 'up' ? 'bg-buy/5' : flash === 'down' ? 'bg-sell/5' : ''}`}
    >
      {/* Coin */}
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
               style={{ background: `${COIN_COLORS[base] || '#3B82F6'}20`, color: COIN_COLORS[base] || '#3B82F6' }}>
            {base.charAt(0)}
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-200">{base}</div>
            <div className="text-[10px] text-gray-600">{symbol}</div>
          </div>
        </div>
      </td>
      {/* Price */}
      <td className="px-3 py-2.5 text-right">
        <span className={`font-mono text-xs font-semibold transition-colors duration-300
                         ${flash === 'up' ? 'text-buy' : flash === 'down' ? 'text-sell' : 'text-gray-200'}`}>
          ${price > 0 ? price.toLocaleString('en-US', { maximumFractionDigits: price < 1 ? 6 : 2 }) : '—'}
        </span>
      </td>
      {/* 24h change */}
      <td className="px-3 py-2.5 text-right">
        <span className={`text-xs font-medium flex items-center justify-end gap-0.5
                         ${isUp ? 'text-buy' : 'text-sell'}`}>
          {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {Math.abs(change24h).toFixed(2)}%
        </span>
      </td>
      {/* Volume */}
      <td className="hidden lg:table-cell px-3 py-2.5 text-right">
        <span className="font-mono text-[10px] text-gray-500">
          {data?.volume_24h ? (data.volume_24h / 1e6).toFixed(1) + 'M' : '—'}
        </span>
      </td>
    </tr>
  )
}

export default function LivePriceTable({ prices, coins, selectedCoin, onSelectCoin, onAddCoin }) {
  const [search, setSearch] = useState('')
  const [newCoin, setNewCoin] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const filtered = coins.filter(s => s.toLowerCase().includes(search.toLowerCase()))

  const handleAdd = () => {
    if (newCoin.trim()) {
      onAddCoin(newCoin.trim().toUpperCase())
      setNewCoin('')
      setShowAdd(false)
    }
  }

  return (
    <div className="glass-card flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
          <TrendingUp size={14} className="text-accent-cyan" />
          Live Prices
        </h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Filter…"
              className="input-dark pl-6 py-1 text-[11px] w-24"
            />
          </div>
          <button onClick={() => setShowAdd(!showAdd)} className="btn-ghost py-1 px-2 text-[11px]">
            <Plus size={12} />
          </button>
        </div>
      </div>

      {/* Add coin row */}
      {showAdd && (
        <div className="px-4 py-2 border-b border-white/5 flex gap-2">
          <input
            value={newCoin} onChange={e => setNewCoin(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="e.g. DOGEUSDT"
            className="input-dark text-xs flex-1"
          />
          <button onClick={handleAdd} className="btn-primary py-1 px-3 text-xs">Add</button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-auto flex-1">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-dark-800/90 backdrop-blur-sm">
            <tr className="text-[10px] text-gray-500 uppercase tracking-wider border-b border-white/5">
              <th className="text-left px-3 py-2 font-medium">Asset</th>
              <th className="text-right px-3 py-2 font-medium">Price</th>
              <th className="text-right px-3 py-2 font-medium">24h</th>
              <th className="hidden lg:table-cell text-right px-3 py-2 font-medium">Vol</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(sym => (
              <PriceCell
                key={sym} symbol={sym} data={prices[sym]}
                isSelected={sym === selectedCoin}
                onClick={() => onSelectCoin(sym)}
              />
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-8 text-center text-gray-600 text-xs">No coins found</div>
        )}
      </div>
    </div>
  )
}

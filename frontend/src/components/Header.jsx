import { useState, useEffect } from 'react'
import { Activity, Wifi, WifiOff, Clock, TrendingUp } from 'lucide-react'

export default function Header({ connected, serverTime }) {
  const [localTime, setLocalTime] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setLocalTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const fmt = (d) => d.toUTCString().replace(' GMT', ' UTC')

  return (
    <header className="sticky top-0 z-40 glass-card border-x-0 border-t-0 rounded-none
                       border-b border-white/5 px-4 py-3">
      <div className="max-w-[1920px] mx-auto flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-blue to-accent-cyan
                            flex items-center justify-center shadow-lg">
              <TrendingUp size={18} className="text-white" />
            </div>
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-buy border-2 border-dark-900 animate-pulse" />
          </div>
          <div>
            <h1 className="font-bold text-base text-white leading-none tracking-tight">
              CryptoAI <span className="text-accent-blue">Signal</span>
            </h1>
            <p className="text-[10px] text-gray-500 leading-none mt-0.5 tracking-wider uppercase">
              AI-Powered Trading Intelligence
            </p>
          </div>
        </div>

        {/* Center — server time */}
        <div className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-lg bg-dark-800/80
                        border border-white/5">
          <Clock size={12} className="text-accent-cyan" />
          <span className="font-mono text-xs text-gray-300 tabular-nums">
            {serverTime ? new Date(serverTime).toUTCString().replace(' GMT', '') : fmt(localTime)}
          </span>
        </div>

        {/* Right — status */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium
                           border transition-all duration-300
                           ${connected
                             ? 'bg-buy/10 border-buy/20 text-buy'
                             : 'bg-dark-800 border-white/5 text-gray-500'}`}>
            {connected
              ? <><Wifi size={12} /><span>LIVE</span><span className="dot-live" /></>
              : <><WifiOff size={12} /><span>OFFLINE</span></>
            }
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                          bg-dark-800 border border-white/5 text-xs text-gray-400">
            <Activity size={12} className="text-accent-purple" />
            <span>Binance WebSocket</span>
          </div>
        </div>
      </div>
    </header>
  )
}

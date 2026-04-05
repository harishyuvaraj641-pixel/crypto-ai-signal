import { useState, useEffect } from 'react'
import { Clock, Timer } from 'lucide-react'

const INTERVALS = [
  { label: '1m', seconds: 60, color: '#06B6D4' },
  { label: '2m', seconds: 120, color: '#8B5CF6' },
  { label: '3m', seconds: 180, color: '#F59E0B' },
  { label: '5m', seconds: 300, color: '#10B981' },
  { label: '15m', seconds: 900, color: '#3B82F6' },
]

function getSecondsUntilNext(intervalSeconds) {
  const now = Math.floor(Date.now() / 1000)
  return intervalSeconds - (now % intervalSeconds)
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

function formatRemaining(s) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return m > 0 ? `${m}:${pad2(sec)}` : `0:${pad2(sec)}`
}

function TimerPanel({ label, seconds, color }) {
  const [remaining, setRemaining] = useState(getSecondsUntilNext(seconds))

  useEffect(() => {
    setRemaining(getSecondsUntilNext(seconds))
    const t = setInterval(() => {
      setRemaining(getSecondsUntilNext(seconds))
    }, 500)
    return () => clearInterval(t)
  }, [seconds])

  const progress = remaining / seconds
  const circ = 2 * Math.PI * 16
  const offset = circ * (1 - progress)

  const nextTime = new Date(Math.ceil(Date.now() / (seconds * 1000)) * seconds * 1000)

  return (
    <div className="glass-card-hover p-3 flex flex-col items-center gap-2">
      {/* Ring */}
      <div className="relative" style={{ width: 44, height: 44 }}>
        <svg width={44} height={44} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={22} cy={22} r={16} fill="none"
                  stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
          <circle cx={22} cy={22} r={16} fill="none"
                  stroke={color} strokeWidth="4"
                  strokeDasharray={circ} strokeDashoffset={offset}
                  strokeLinecap="round"
                  style={{
                    transition: 'stroke-dashoffset 0.5s linear',
                    filter: `drop-shadow(0 0 4px ${color}80)`,
                  }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-bold text-[9px] font-mono" style={{ color }}>
            {label}
          </span>
        </div>
      </div>

      {/* Countdown */}
      <div className="text-center">
        <div className="font-mono text-base font-bold text-gray-200 tabular-nums leading-none">
          {formatRemaining(remaining)}
        </div>
        <div className="text-[9px] text-gray-600 mt-0.5">
          {nextTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-0.5 bg-dark-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
             style={{ width: `${(1 - progress) * 100}%`, background: color, opacity: 0.7 }} />
      </div>
    </div>
  )
}

export default function CountdownTimers() {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Timer size={14} className="text-accent-cyan" />
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Next Candle Timers
        </h3>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {INTERVALS.map(tf => (
          <TimerPanel key={tf.label} {...tf} />
        ))}
      </div>
    </div>
  )
}

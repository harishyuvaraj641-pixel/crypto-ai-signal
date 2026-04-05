import { useState, useEffect } from 'react'
import { Settings, Play, Square, Key, Bot, Cpu, RefreshCw, ChevronDown, AlertTriangle } from 'lucide-react'

const DEFAULT_MODELS = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
  gemini: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash'],
  claude: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
  deepseek: ['deepseek-chat', 'deepseek-reasoner'],
  perplexity: ['llama-3.1-sonar-large-128k-online'],
  nemotron: ['nvidia/llama-3.1-nemotron-70b-instruct'],
  nvidia: ['deepseek-ai/deepseek-v3.2', 'meta/llama-3.1-70b-instruct', 'mistralai/mistral-large-2-instruct'],
  openrouter: ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet', 'deepseek/deepseek-chat', 'meta-llama/llama-3.1-70b-instruct'],
}

const INTERVAL_OPTIONS = [
  { label: '30 sec', value: 30 },
  { label: '1 min', value: 60 },
  { label: '2 min', value: 120 },
  { label: '5 min', value: 300 },
  { label: '15 min', value: 900 },
]

export default function ControlPanel({
  providers, coins, predictionActive, loading, error,
  onStart, onStop,
}) {
  const [provider, setProvider] = useState('nvidia')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('deepseek-ai/deepseek-v3.2')
  const [customModel, setCustomModel] = useState('')
  const [selectedCoin, setSelectedCoin] = useState('BTCUSDT')
  const [timeframe, setTimeframe] = useState('5m')
  const [intervalSec, setIntervalSec] = useState(60)
  const [showKey, setShowKey] = useState(false)

  const providerList = Object.entries(providers)
  const modelList = providers[provider]?.models || DEFAULT_MODELS[provider] || []

  useEffect(() => {
    const models = providers[provider]?.models || DEFAULT_MODELS[provider] || []
    if (models.length) setModel(models[0])
  }, [provider, providers])

  const handleStart = () => {
    if (!apiKey.trim()) return
    onStart({
      provider,
      api_key: apiKey.trim(),
      model: customModel.trim() || model,
      symbol: selectedCoin,
      timeframe,
      interval_seconds: intervalSec,
    })
  }

  const activeModel = customModel.trim() || model

  return (
    <div className="glass-card p-4 flex flex-col gap-4">
      {/* Title */}
      <div className="flex items-center gap-2 pb-2 border-b border-white/5">
        <Settings size={14} className="text-accent-cyan" />
        <h2 className="text-sm font-semibold text-gray-200">AI Configuration</h2>
        {predictionActive && (
          <span className="ml-auto flex items-center gap-1 text-[10px] font-medium text-buy">
            <span className="dot-live" />
            ACTIVE
          </span>
        )}
      </div>

      {/* Provider */}
      <div className="space-y-1.5">
        <label className="stat-label flex items-center gap-1">
          <Bot size={10} />AI Provider
        </label>
        <div className="relative">
          <select
            value={provider} onChange={e => setProvider(e.target.value)}
            disabled={predictionActive}
            className="select-dark pr-8"
          >
            {providerList.length > 0
              ? providerList.map(([id, info]) => (
                  <option key={id} value={id}>{info.name}</option>
                ))
              : Object.keys(DEFAULT_MODELS).map(id => (
                  <option key={id} value={id}>{id.charAt(0).toUpperCase() + id.slice(1)}</option>
                ))
            }
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        </div>
      </div>

      {/* Model */}
      <div className="space-y-1.5">
        <label className="stat-label flex items-center gap-1">
          <Cpu size={10} />Model
        </label>
        <div className="relative">
          <select
            value={model} onChange={e => { setModel(e.target.value); setCustomModel('') }}
            disabled={predictionActive}
            className="select-dark pr-8"
          >
            {modelList.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        </div>
        <input
          value={customModel} onChange={e => setCustomModel(e.target.value)}
          placeholder="Or type custom model name…"
          disabled={predictionActive}
          className="input-dark text-xs"
        />
      </div>

      {/* API Key */}
      <div className="space-y-1.5">
        <label className="stat-label flex items-center gap-1">
          <Key size={10} />API Key
        </label>
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey} onChange={e => setApiKey(e.target.value)}
            placeholder={`Enter ${provider} API key…`}
            disabled={predictionActive}
            className="input-dark pr-10 font-mono text-xs"
          />
          <button
            onClick={() => setShowKey(!showKey)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
          >
            {showKey ? '🙈' : '👁'}
          </button>
        </div>
      </div>

      {/* Coin + Timeframe */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="stat-label">Coin</label>
          <div className="relative">
            <select value={selectedCoin} onChange={e => setSelectedCoin(e.target.value)}
                    disabled={predictionActive} className="select-dark pr-8">
              {coins.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="stat-label">Timeframe</label>
          <div className="relative">
            <select value={timeframe} onChange={e => setTimeframe(e.target.value)}
                    disabled={predictionActive} className="select-dark pr-8">
              {['1m','2m','3m','4m','5m','10m','15m','30m','1h','4h','1d'].map(tf => (
                <option key={tf} value={tf}>{tf}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Interval */}
      <div className="space-y-1.5">
        <label className="stat-label flex items-center gap-1"><RefreshCw size={10} />Prediction Interval</label>
        <div className="grid grid-cols-5 gap-1">
          {INTERVAL_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setIntervalSec(opt.value)}
              disabled={predictionActive}
              className={`py-1.5 rounded text-[10px] font-medium transition-all duration-150
                         ${intervalSec === opt.value
                           ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/30'
                           : 'text-gray-500 border border-white/5 hover:border-white/10 hover:text-gray-300'
                         } disabled:opacity-40`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-sell/10 border border-sell/20 text-xs text-sell">
          <AlertTriangle size={12} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-2 pt-1">
        {!predictionActive ? (
          <button
            onClick={handleStart}
            disabled={!apiKey.trim() || loading}
            className="btn-primary flex-1"
          >
            {loading ? <RefreshCw size={13} className="animate-spin" /> : <Play size={13} fill="currentColor" />}
            {loading ? 'Starting…' : 'Start Prediction'}
          </button>
        ) : (
          <button onClick={onStop} disabled={loading} className="btn-danger flex-1">
            {loading ? <RefreshCw size={13} className="animate-spin" /> : <Square size={13} fill="currentColor" />}
            Stop Prediction
          </button>
        )}
      </div>

      {/* Active config summary */}
      {predictionActive && (
        <div className="p-2.5 rounded-lg bg-buy/5 border border-buy/15 text-[10px] text-gray-400 space-y-1">
          <div className="font-semibold text-buy text-[11px] mb-1">Active Session</div>
          <div className="flex justify-between"><span>Provider:</span><span className="text-gray-300 capitalize">{provider}</span></div>
          <div className="flex justify-between"><span>Model:</span><span className="text-gray-300 font-mono truncate max-w-[120px]">{activeModel.split('/').pop()}</span></div>
          <div className="flex justify-between"><span>Interval:</span><span className="text-gray-300">{intervalSec}s</span></div>
        </div>
      )}
    </div>
  )
}

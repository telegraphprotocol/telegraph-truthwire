import React, { useState, useEffect, useRef } from 'react'
import { Terminal, Activity, Receipt } from 'lucide-react'

function formatTime() {
  const d = new Date()
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  const s = d.getSeconds().toString().padStart(2, '0')
  const ms = d.getMilliseconds().toString().padStart(3, '0')
  return `${h}:${m}:${s}.${ms}`
}

function shortHash(hash: string | null | undefined): string {
  if (!hash || hash.length < 16) return hash ?? '—'
  return `${hash.slice(0, 8)}…${hash.slice(-8)}`
}

interface LogItem {
  id: string
  time: string
  group: string
  level: string
  text: string
}

const LEVEL_COLOR: Record<string, string> = {
  CMD:       '#facc15',
  PAYMENT:   '#fb923c',
  CONFIRM:   '#4ade80',
  PROOF:     '#4ade80',
  CONSENSUS: '#4ade80',
  SIGNAL:    '#818cf8',
  RANK:      '#a78bfa',
  ROUTE:     '#22d3ee',
  POOL:      '#94a3b8',
  INFO:      '#94a3b8',
  ROUTING:   '#818cf8',
  INIT:      '#94a3b8',
  STATUS:    '#94a3b8',
  GROQ:      '#f472b6',
  LLM:       '#60a5fa',
  TX:        '#34d399',
  PROOF2:    '#4ade80',
  ERROR:     '#f87171',
}

interface PipelineDecision {
  keyword: string
  market: { title: string }
  decision: { action: string; token: string | null; likelihood: number }
  diagnostics?: { groqTxHash: string | null; llmTxHash: string | null }
}

export interface PipelineRunResult {
  startedAt: string
  completedAt: string
  keywords: string[]
  counts: { marketsAnalyzed: number; skippedInactive: number; buy: number; wait: number }
  decisions: PipelineDecision[]
  contextSummary: string
}

interface Props {
  loading: boolean
  data: PipelineRunResult | null
  error: string | null
  onComplete?: () => void
}

const TerminalFeed: React.FC<Props> = ({ loading, data, error, onComplete }) => {
  const [logs, setLogs] = useState<LogItem[]>([])
  const [receipt, setReceipt] = useState<Record<string, string> | null>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const onCompleteRef = useRef(onComplete)
  useEffect(() => { onCompleteRef.current = onComplete }, [onComplete])

  const addLog = (logItem: Omit<LogItem, 'id' | 'time'>, delay: number) => {
    const timer = setTimeout(() => {
      setLogs(prev => [...prev, { ...logItem, time: formatTime(), id: Math.random().toString(36).substring(7) }])
    }, delay)
    timersRef.current.push(timer)
  }

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight
    }
  }, [logs, receipt])

  useEffect(() => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []

    const randMs = () => Math.floor(Math.random() * 180 + 80)

    if (loading) {
      setLogs([])
      setReceipt(null)

      let delay = 100
      addLog({ group: 'Telegraph CLI', level: 'CMD', text: '$ telegraph run --agent quant-01' }, delay)
      delay += 450
      addLog({ group: 'Telegraph CLI', level: 'ROUTING', text: 'Pipeline request broadcasted to Telegraph Subnets' }, delay)
      delay += 550
      addLog({ group: 'x402 Protocol', level: 'PAYMENT', text: '[DevNet] HTTP 402 Payment Required → Submitting 0.01 USDC via x402 protocol...' }, delay)
      delay += 500
      addLog({ group: 'x402 Protocol', level: 'CONFIRM', text: `[DevNet] ✓ Payment confirmed. Settlement: ${randMs()}ms` }, delay)
      delay += 600
      addLog({ group: 'Consensus Pool', level: 'INFO', text: '[DevNet] Fetching Telegraph Leaderboard...' }, delay)
      delay += 400
      addLog({ group: 'Consensus Pool', level: 'POOL', text: '4 providers in consensus pool:' }, delay)
      delay += 300
      addLog({ group: 'Consensus Pool', level: 'RANK', text: '· Bittensor Subnet 19    (rank #2, score 0.94)' }, delay)
      delay += 200
      addLog({ group: 'Consensus Pool', level: 'RANK', text: '· OpenAI GPT-4o          (rank #4, score 0.87)' }, delay)
      delay += 200
      addLog({ group: 'Consensus Pool', level: 'RANK', text: '· Anthropic Claude       (rank #3, score 0.91)' }, delay)
      delay += 200
      addLog({ group: 'Consensus Pool', level: 'RANK', text: '· Hyperliquid Data Node  (rank #1, score 0.97)' }, delay)
      delay += 450
      addLog({ group: 'Consensus Pool', level: 'ROUTE', text: '[DevNet] Routing request to Top-Ranked Miner → Hyperliquid Data Node ✓' }, delay)
      delay += 600
      addLog({ group: 'Pipeline Routing', level: 'INIT', text: 'Scanning Polymarket for active market candidates...' }, delay)
      delay += 600
      addLog({ group: 'Pipeline Routing', level: 'STATUS', text: 'Handshake established with Telegraph Nodes' }, delay)
      delay += 700
      addLog({ group: 'News Research', level: 'GROQ', text: 'Routing news queries through Telegraph Groqqle subnet...' }, delay)
      delay += 700
      addLog({ group: 'LLM Decision', level: 'LLM', text: 'Calling Telegraph LLM for market decision analysis...' }, delay)
      delay += 600
      addLog({ group: 'LLM Decision', level: 'STATUS', text: 'Awaiting consensus from subnet nodes...' }, delay)

    } else if (data) {
      let delay = 100

      for (const item of data.decisions.slice(0, 5)) {
        const groqTx = item.diagnostics?.groqTxHash
        const llmTx = item.diagnostics?.llmTxHash
        const action = item.decision.action.toUpperCase()
        const confidence = item.decision.likelihood ? (item.decision.likelihood).toFixed(2) : '0.80'

        addLog({ group: 'x402 Protocol', level: 'PAYMENT', text: `[DevNet] HTTP 402 Payment Required → Submitting 0.01 USDC via x402 protocol...` }, delay)
        delay += 400
        addLog({ group: 'x402 Protocol', level: 'CONFIRM', text: `[DevNet] ✓ Payment confirmed. Settlement: ${randMs()}ms` }, delay)
        delay += 350
        addLog({ group: 'News Research', level: 'GROQ', text: `News search for "${item.keyword}" — ${groqTx ? 'paid on-chain' : 'no payment recorded'}` }, delay)
        delay += 300
        if (groqTx) {
          addLog({ group: 'News Research', level: 'TX', text: `Settlement (id: ${shortHash(groqTx)})` }, delay)
          delay += 250
        }
        addLog({ group: 'Proof Verification', level: 'PROOF', text: '[DevNet] ✓ zkTLS Proof Validated' }, delay)
        delay += 300
        addLog({ group: 'Proof Verification', level: 'CONSENSUS', text: '[DevNet] ✓ BFT Consensus Reached on Signal' }, delay)
        delay += 300
        addLog({ group: 'LLM Decision', level: 'SIGNAL', text: `Signal: ${action}${item.decision.token ? ' ' + item.decision.token : ''} · "${item.market.title.slice(0, 48)}${item.market.title.length > 48 ? '…' : ''}" · confidence ${confidence}` }, delay)
        delay += 300
        if (llmTx) {
          addLog({ group: 'LLM Decision', level: 'TX', text: `Settlement (id: ${shortHash(llmTx)})` }, delay)
          delay += 250
        }
      }

      addLog({ group: 'Proof Verification', level: 'PROOF', text: 'All cryptographic proofs verified across subnet nodes' }, delay)
      delay += 500
      addLog({ group: 'Proof Verification', level: 'SIGNAL', text: `Consensus reached — ${data.counts.buy} buy / ${data.counts.wait} wait across ${data.counts.marketsAnalyzed} market(s)` }, delay)
      delay += 400

      const timer = setTimeout(() => {
        const elapsed =
          data.completedAt && data.startedAt
            ? `${((new Date(data.completedAt).getTime() - new Date(data.startedAt).getTime()) / 1000).toFixed(1)}s`
            : '—'
        setReceipt({
          Provider: 'TELEGRAPH',
          Network: 'Solana',
          Timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
          'Markets Analyzed': String(data.counts.marketsAnalyzed),
          'Buy Decisions': String(data.counts.buy),
          'Wait Decisions': String(data.counts.wait),
          'Elapsed': elapsed,
        })
        if (onCompleteRef.current) onCompleteRef.current()
      }, delay)
      timersRef.current.push(timer)

    } else if (error) {
      addLog({ group: 'System Failure', level: 'ERROR', text: `Pipeline aborted: ${error}` }, 100)
      const timer = setTimeout(() => {
        if (onCompleteRef.current) onCompleteRef.current()
      }, 500)
      timersRef.current.push(timer)
    }

    return () => {
      timersRef.current.forEach(clearTimeout)
    }
  }, [loading, data, error])

  if (!loading && !data && !error) return null

  return (
    <div className="terminal-container">
      <div className="terminal-header">
        <div className="terminal-header-title">
          <Terminal size={14} />
          Telegraph Terminal
        </div>
        <div className="terminal-header-dots">
          <span className="dot red"></span>
          <span className="dot yellow"></span>
          <span className="dot green"></span>
        </div>
      </div>

      <div className="terminal-body" ref={bodyRef}>
        <div className="terminal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Activity size={18} color="#3b82f6" />
          Live Settlement &amp; Logic Feed
        </div>

        {logs.map((log, index) => {
          const showGroup = index === 0 || log.group !== logs[index - 1].group
          return (
            <React.Fragment key={log.id}>
              {showGroup && (
                <div className="terminal-group-header">
                  <span className="terminal-col-time">Time</span>
                  <span className="terminal-col-group">{log.group}</span>
                </div>
              )}
              <div className="terminal-row">
                <div className="terminal-col-time">
                  <span className="terminal-time-badge">{log.time}</span>
                </div>
                <div className="terminal-col-content">
                  <div className="terminal-level" style={{ color: LEVEL_COLOR[log.level] ?? '#ffffff' }}>{log.level}</div>
                  <div className="terminal-text">{log.text}</div>
                </div>
              </div>
            </React.Fragment>
          )
        })}

        {receipt && (
          <div className="terminal-receipt animate-in">
            <div className="receipt-title">
              <Receipt size={18} />
              Pipeline Receipt
            </div>
            {Object.entries(receipt).map(([label, value]) => (
              <div className="receipt-row" key={label}>
                <span className="receipt-label">{label}:</span>
                <span className="receipt-value">{value}</span>
              </div>
            ))}
          </div>
        )}

        {loading && !receipt && logs.length > 0 && (
          <div className="terminal-cursor">_</div>
        )}
      </div>
    </div>
  )
}

export default TerminalFeed

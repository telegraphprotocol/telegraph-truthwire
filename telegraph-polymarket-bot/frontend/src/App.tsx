import { useState, useEffect, useCallback } from 'react'
import { Activity, ShoppingCart, TrendingUp, HelpCircle, Sun, Moon, X } from 'lucide-react'
import api from './utils/api'
import './App.css'

type Theme = 'dark' | 'light'
const THEME_STORAGE_KEY = 'supersignal-theme'

type Accent = 'info' | 'success' | 'warning' | 'danger'

const ACCENTS: Accent[] = ['info', 'success', 'warning', 'danger']
const accentFor = (key: string): Accent => {
  let hash = 0
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  return ACCENTS[hash % ACCENTS.length]
}

interface Signal {
  id: string
  intent: string
  category: string | null
  questionText: string
  matchedMarketTitle: string | null
  matchedYesPrice: string | null
  matchedNoPrice: string | null
  matchedMarketUrl: string | null
  matchReason: string | null
  decisionAction: string | null
  decisionReason: string | null
  decisionLabel: string
  likelihood: number | null
  createdAt: string
}

interface Trade {
  id: string
  marketTitle: string
  side: 'BUY' | 'SELL'
  entryPrice: number
  exitPrice: number | null
  stake: number
  shares: number
  pnl: number | null
  currentPrice: number | null
  unrealizedPnl: number | null
  status: 'open' | 'closed'
  openedAt: string
  closedAt: string | null
}

interface Portfolio {
  startingBalance: number
  balance: number
  totalPnl: number
  openPositions: number
  updatedAt: string
}

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

const money = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function App() {
  const [signals, setSignals] = useState<Signal[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [signalPage, setSignalPage] = useState(1)
  const [signalTotalPages, setSignalTotalPages] = useState(1)
  const [tradePage, setTradePage] = useState(1)
  const [tradeTotalPages, setTradeTotalPages] = useState(1)
  const [isLive, setIsLive] = useState(false)
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem(THEME_STORAGE_KEY) as Theme) || 'dark')
  const [showHowItWorks, setShowHowItWorks] = useState(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  const refreshSignals = useCallback(async () => {
    try {
      const { data } = await api.get('/signals', { params: { page: signalPage, limit: 10 } })
      setSignals(Array.isArray(data?.items) ? data.items : [])
      setSignalTotalPages(Math.max(1, Number(data?.totalPages) || 1))
      setIsLive(true)
    } catch (error) {
      console.error('Failed to load signals:', error)
      setIsLive(false)
    }
  }, [signalPage])

  const refreshTrades = useCallback(async () => {
    try {
      const { data } = await api.get('/trades', { params: { page: tradePage, limit: 8 } })
      setTrades(Array.isArray(data?.items) ? data.items : [])
      setTradeTotalPages(Math.max(1, Number(data?.totalPages) || 1))
    } catch (error) {
      console.error('Failed to load trades:', error)
    }
  }, [tradePage])

  const refreshPortfolio = useCallback(async () => {
    try {
      const { data } = await api.get('/portfolio')
      setPortfolio(data as Portfolio)
    } catch (error) {
      console.error('Failed to load portfolio:', error)
    }
  }, [])

  useEffect(() => {
    refreshSignals()
    refreshPortfolio()
    const interval = setInterval(() => {
      refreshSignals()
      refreshPortfolio()
    }, 12000)
    return () => clearInterval(interval)
  }, [refreshSignals, refreshPortfolio])

  useEffect(() => {
    refreshTrades()
    const interval = setInterval(refreshTrades, 12000)
    return () => clearInterval(interval)
  }, [refreshTrades])

  const totalPnl = portfolio?.totalPnl ?? 0
  const startingBalance = portfolio?.startingBalance ?? null

  return (
    <div className="app-container">
      <div className="dot-grid-overlay bg-dot-grid" />

      <header className="header">
        <div className="logo-section">
          <img src="/supersignal-favicon.svg" alt="" width={22} height={22} className="logo-icon" />
          <div className="logo-group">
            <span className="logo-text">SUPERSIGNAL</span>
            <span className="powered-by">Powered by Telegraph</span>
          </div>
        </div>
        <div className="header-actions">
          <span className={`status-pill ${isLive ? 'live' : 'idle'}`}>
            <span className="status-dot" />
            {isLive ? 'Live' : 'Connecting'}
          </span>
          <button
            className="icon-btn"
            onClick={() => setShowHowItWorks((v) => !v)}
            aria-label="How it works"
          >
            <HelpCircle size={16} />
          </button>
          <button
            className="icon-btn"
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      {showHowItWorks && (
        <div className="how-it-works-backdrop" onClick={() => setShowHowItWorks(false)}>
          <div className="how-it-works-popover" onClick={(e) => e.stopPropagation()}>
            <div className="how-it-works-header">
              <span>How SuperSignal Works</span>
              <button className="icon-btn" onClick={() => setShowHowItWorks(false)} aria-label="Close">
                <X size={14} />
              </button>
            </div>
            <p className="how-it-works-intro">SuperSignal watches for real-world news events and automatically paper-trades them on Polymarket. Here's the exact pipeline, step by step:</p>
            <ol className="how-it-works-list">
              <li>
                <strong>1. A live signal arrives.</strong> We keep an always-on WebSocket connection open to a Telegraph node. The moment it detects a newsworthy event (e.g. "Will the Fed cut rates in January?"), it pushes that question to us instantly — no polling, no delay.
              </li>
              <li>
                <strong>2. We search Polymarket for a matching market.</strong> We take the signal's question and search it against Polymarket's own market API. That search typically returns 10+ candidate markets that mention similar keywords or topics.
              </li>
              <li>
                <strong>3. An LLM picks the right one (or none).</strong> A keyword search alone can't tell a live market apart from an old, already-resolved one about the same topic (e.g. last year's Fed meeting vs. next month's). So we hand all 10+ candidates to an LLM, which reads each one and identifies the single market — if any — that's both about the same event and still open for trading. If nothing genuinely matches, it says so, and we stop here.
              </li>
              <li>
                <strong>4. A second LLM decides whether to trade.</strong> Once a market is matched, we show a different LLM call the market's live YES/NO prices and ask it to estimate the true probability of the event. It only recommends buying YES or NO when that estimate clearly supports one side (over 50% confidence); otherwise it says wait.
              </li>
              <li>
                <strong>5. We simulate the trade and track it live.</strong> If a trade is recommended, we open a simulated (paper) position sized to how confident the LLM was — no real money ever moves. From there we track that position's profit/loss in real time against Polymarket's live price, right up until it closes.
              </li>
            </ol>
          </div>
        </div>
      )}

      <main className="main-content">
        <div className="portfolio-strip">
          <div className="portfolio-tile glass-card">
            <div className="tile-label">Starting Balance</div>
            <div className="tile-value">{startingBalance !== null ? `$${money(startingBalance)}` : '—'}</div>
          </div>
          <div className="portfolio-tile glass-card">
            <div className="tile-label">Current Balance</div>
            <div className="tile-value">{portfolio ? `$${money(portfolio.balance)}` : '—'}</div>
          </div>
          <div className="portfolio-tile glass-card">
            <div className="tile-label">Total P&amp;L</div>
            <div className={`tile-value ${totalPnl >= 0 ? 'success' : 'danger'}`}>
              {portfolio ? `${totalPnl >= 0 ? '+' : ''}$${money(totalPnl)}` : '—'}
            </div>
          </div>
          <div className="portfolio-tile glass-card">
            <div className="tile-label">Open Positions</div>
            <div className="tile-value">{portfolio?.openPositions ?? '—'}</div>
          </div>
        </div>

        <div className="content-grid">
          <div className="panel glass-card">
            <div className="panel-header">
              <div className="panel-title">
                <Activity size={16} color="var(--foreground)" />
                Decision History
              </div>
              <span className="source-tag">Telegraph Daemon</span>
            </div>

            <div className="signal-feed">
              {signals.length === 0 && (
                <div className="empty-state">Waiting for the next Telegraph Daemon cycle (every 3 hours)...</div>
              )}
              {signals.map((signal) => {
                const accent = accentFor(signal.intent)
                const pct = signal.likelihood !== null ? Math.round(signal.likelihood * 100) : null
                const decisionPillClass =
                  signal.decisionLabel === 'BUY YES' ? 'success' :
                  signal.decisionLabel === 'BUY NO' ? 'danger' :
                  signal.decisionLabel === 'WAIT' ? 'warning' : 'neutral'
                return (
                  <div key={signal.id} className="signal-row signal-row-in">
                    <div className={`signal-row-accent pill ${accent}`} style={{ background: `var(--${accent})` }} />
                    <div className="signal-row-top">
                      <span className={`signal-category`} style={{ color: `var(--${accent})` }}>
                        {signal.category || signal.intent}
                      </span>
                      <span className="signal-time">{timeAgo(signal.createdAt)}</span>
                    </div>
                    <p className="signal-question">{signal.questionText}</p>
                    <div className="signal-decision-line">
                      <span className={`pill ${decisionPillClass}`}>{signal.decisionLabel}</span>
                      {pct !== null && <span className="pill neutral">{pct}% likely</span>}
                    </div>
                    {signal.matchedMarketTitle && (
                      <div className="signal-market-line">
                        <a
                          className="signal-market-title"
                          href={signal.matchedMarketUrl || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {signal.matchedMarketTitle}
                        </a>
                        <div className="signal-market-prices">
                          <span className="pill success">YES {signal.matchedYesPrice}</span>
                          <span className="pill danger">NO {signal.matchedNoPrice}</span>
                        </div>
                      </div>
                    )}
                    {(signal.matchReason || signal.decisionReason) && (
                      <div className="signal-reasoning">
                        {signal.matchReason && <p><strong>Match:</strong> {signal.matchReason}</p>}
                        {signal.decisionReason && <p><strong>Decision:</strong> {signal.decisionReason}</p>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="pagination">
              <button
                className="pagination-btn"
                onClick={() => setSignalPage((p) => Math.max(1, p - 1))}
                disabled={signalPage <= 1}
              >
                Prev
              </button>
              <span>Page {signalPage} / {signalTotalPages}</span>
              <button
                className="pagination-btn"
                onClick={() => setSignalPage((p) => Math.min(signalTotalPages, p + 1))}
                disabled={signalPage >= signalTotalPages}
              >
                Next
              </button>
            </div>
          </div>

          <div className="panel glass-card">
            <div className="panel-header">
              <div className="panel-title">
                <ShoppingCart size={16} color="var(--foreground)" />
                Simulated Trades
              </div>
              <span className="source-tag">Paper Trading</span>
            </div>

            <div className="trade-list">
              {trades.length === 0 && (
                <div className="empty-state">No simulated trades yet. Waiting for a matched signal.</div>
              )}
              {trades.map((trade) => {
                const outcome = trade.side === 'BUY' ? 'YES' : 'NO'
                return (
                <div key={trade.id} className="trade-item">
                  <div className="trade-item-top">
                    <span className={`pill ${trade.side === 'BUY' ? 'success' : 'danger'}`}>
                      BUY {outcome}
                    </span>
                    <span className={`pill ${trade.status === 'open' ? 'info' : 'neutral'}`}>
                      {trade.status === 'open' ? 'OPEN' : 'CLOSED'}
                    </span>
                  </div>
                  <div className="trade-market-title" title={trade.marketTitle}>{trade.marketTitle}</div>
                  <div className="trade-fill-summary">
                    Bought {trade.shares.toFixed(2)} {outcome} shares @ {(trade.entryPrice * 100).toFixed(1)}¢ for ${money(trade.stake)}
                  </div>
                  {trade.status === 'closed' && trade.exitPrice !== null && (
                    <div className="trade-fill-summary">
                      Closed out at {(trade.exitPrice * 100).toFixed(1)}¢
                    </div>
                  )}
                  {trade.status === 'open' && trade.currentPrice !== null && (
                    <div className="trade-fill-summary">
                      Now trading at {(trade.currentPrice * 100).toFixed(1)}¢
                    </div>
                  )}
                  <div className="trade-meta-row">
                    <span>{trade.status === 'open' ? timeAgo(trade.openedAt) : `closed ${timeAgo(trade.closedAt || trade.openedAt)}`}</span>
                    {(() => {
                      const displayPnl = trade.status === 'closed' ? trade.pnl : trade.unrealizedPnl
                      if (displayPnl === null) return <span>—</span>
                      return (
                        <span className={`trade-pnl ${displayPnl >= 0 ? 'success' : 'danger'}`} style={{ color: displayPnl >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                          <TrendingUp size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
                          {displayPnl >= 0 ? '+' : ''}${money(displayPnl)}
                          {trade.status === 'open' && ' (unrealized)'}
                        </span>
                      )
                    })()}
                  </div>
                </div>
              )})}
            </div>

            <div className="pagination">
              <button
                className="pagination-btn"
                onClick={() => setTradePage((p) => Math.max(1, p - 1))}
                disabled={tradePage <= 1}
              >
                Prev
              </button>
              <span>Page {tradePage} / {tradeTotalPages}</span>
              <button
                className="pagination-btn"
                onClick={() => setTradePage((p) => Math.min(tradeTotalPages, p + 1))}
                disabled={tradePage >= tradeTotalPages}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </main>

      <footer className="footer">
        <span>© 2026 SuperSignal — simulated trading demo</span>
        <span>Built on the Telegraph Network</span>
      </footer>
    </div>
  )
}

export default App

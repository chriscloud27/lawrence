import { useMemo, useState } from 'react'
import {
  TrendingUp,
  TrendingDown,
  Search,
  ChevronUp,
  ChevronDown,
  Download,
} from 'lucide-react'
import { sampleParents } from '../data/mock-data'
import { getScoreBand, getBandColor, getBandLabel } from '../utils/score'
import type { Parent, ScoreBand } from '../types/lawrence'

interface DashboardProps {
  onNavigate: (screen: string) => void
}

const KPI_CARDS = [
  { title: 'New Parents', value: '47', trend: '↑ 12% vs last week', positive: true },
  { title: 'Hot Leads', value: '8', trend: '↑ 3 this week', positive: true },
  { title: 'Avg Score', value: '61/100', trend: '↑ from 54 last month', positive: true },
  { title: 'Response Time', value: '< 4 hrs', trend: '↓ from 9h last month', positive: true },
]

const DISTRIBUTION: { band: ScoreBand; pct: number; count: number }[] = [
  { band: 'cold', pct: 38, count: 18 },
  { band: 'warm', pct: 21, count: 10 },
  { band: 'qualified', pct: 30, count: 14 },
  { band: 'hot', pct: 11, count: 5 },
]

const TRENDING = [
  { pattern: 'IB curriculum', meta: '23 parents', trend: '↑ 40%', isNew: false },
  { pattern: 'Boarding in Switzerland', meta: '18 parents', trend: '↑ 25%', isNew: false },
  { pattern: 'Learning support / SEN', meta: '15 parents', trend: 'steady', isNew: false },
  { pattern: 'Under £25k per year', meta: '12 parents', trend: '↑ 60%', isNew: false },
  { pattern: 'Co-ed sixth form', meta: '9 parents', trend: 'new', isNew: true },
]

type SortKey = 'name' | 'child' | 'score' | 'band' | 'timeline' | 'status' | 'activity'

const BAND_FILTERS = ['All', 'Cold', 'Warm', 'Qualified', 'Hot']
const TIMELINE_FILTERS = ['All', 'This term', 'Next year', '2+ years']
const STATUS_FILTERS = ['All', 'New', 'Contacted', 'In Progress', 'Auto-nurture']

export function Dashboard({ onNavigate }: DashboardProps) {
  const [bandFilter, setBandFilter] = useState('All')
  const [timelineFilter, setTimelineFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('score')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const rows = useMemo(() => {
    let list = sampleParents.filter((p) => {
      if (bandFilter !== 'All' && getBandLabel(getScoreBand(p.totalScore)) !== bandFilter) {
        return false
      }
      if (statusFilter !== 'All' && p.status !== statusFilter.toLowerCase().replace(' ', '-')) {
        return false
      }
      if (
        search &&
        !p.name.toLowerCase().includes(search.toLowerCase()) &&
        !p.email.toLowerCase().includes(search.toLowerCase())
      ) {
        return false
      }
      return true
    })

    list = [...list].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      switch (sortKey) {
        case 'name':
          return a.name.localeCompare(b.name) * dir
        case 'child':
          return a.childName.localeCompare(b.childName) * dir
        case 'score':
          return (a.totalScore - b.totalScore) * dir
        case 'band':
          return a.band.localeCompare(b.band) * dir
        case 'timeline':
          return a.timeline.localeCompare(b.timeline) * dir
        case 'status':
          return a.status.localeCompare(b.status) * dir
        case 'activity':
          return a.lastUpdatedDisplay.localeCompare(b.lastUpdatedDisplay) * dir
        default:
          return 0
      }
    })

    return list
  }, [bandFilter, statusFilter, search, sortKey, sortDir])

  const sortIcon = (key: SortKey) =>
    sortKey === key ? (
      <span className="lw-dash-sort-icon">
        {sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </span>
    ) : null

  return (
    <div className="lw-dash-page">
      <div className="lw-dash-kpi-row">
        {KPI_CARDS.map((card) => (
          <div key={card.title} className="lw-dash-kpi-card">
            <div className="lw-dash-kpi-title">{card.title}</div>
            <div className="lw-dash-kpi-value">{card.value}</div>
            <div className={`lw-dash-kpi-trend ${card.positive ? 'positive' : 'negative'}`}>
              {card.positive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {card.trend}
            </div>
          </div>
        ))}
      </div>

      <div className="lw-dash-layout">
        <div className="lw-dash-main">
          <div className="lw-dash-section-label">Score Distribution</div>
          <div className="lw-dash-dist-bar">
            {DISTRIBUTION.map((seg) => {
              const color = getBandColor(seg.band)
              return (
                <div
                  key={seg.band}
                  className="lw-dash-dist-segment"
                  style={{ width: `${seg.pct}%`, backgroundColor: color.bg }}
                />
              )
            })}
          </div>
          <div className="lw-dash-dist-legend">
            {DISTRIBUTION.map((seg) => {
              const color = getBandColor(seg.band)
              return (
                <div key={seg.band} className="lw-dash-dist-legend-item">
                  <span className="lw-dash-dist-legend-dot" style={{ backgroundColor: color.dot }} />
                  {getBandLabel(seg.band)}: {seg.count}
                </div>
              )
            })}
          </div>

          <div className="lw-dash-filter-bar">
            <select
              className="lw-select lw-dash-filter-select"
              value={bandFilter}
              onChange={(e) => setBandFilter(e.target.value)}
            >
              {BAND_FILTERS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === 'All' ? 'Score Band: All' : opt}
                </option>
              ))}
            </select>
            <select
              className="lw-select lw-dash-filter-select"
              value={timelineFilter}
              onChange={(e) => setTimelineFilter(e.target.value)}
            >
              {TIMELINE_FILTERS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === 'All' ? 'Timeline: All' : opt}
                </option>
              ))}
            </select>
            <select
              className="lw-select lw-dash-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {STATUS_FILTERS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === 'All' ? 'Status: All' : opt}
                </option>
              ))}
            </select>
            <div className="lw-dash-search">
              <Search size={16} />
              <input
                className="lw-input"
                type="text"
                placeholder="Search by name or email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="lw-dash-table-wrap">
            <table className="lw-dash-table">
              <thead>
                <tr>
                  <th className={sortKey === 'name' ? 'active' : ''} onClick={() => toggleSort('name')}>
                    Name{sortIcon('name')}
                  </th>
                  <th className={sortKey === 'child' ? 'active' : ''} onClick={() => toggleSort('child')}>
                    Child{sortIcon('child')}
                  </th>
                  <th className={sortKey === 'score' ? 'active' : ''} onClick={() => toggleSort('score')}>
                    Score{sortIcon('score')}
                  </th>
                  <th className={sortKey === 'band' ? 'active' : ''} onClick={() => toggleSort('band')}>
                    Band{sortIcon('band')}
                  </th>
                  <th
                    className={sortKey === 'timeline' ? 'active' : ''}
                    onClick={() => toggleSort('timeline')}
                  >
                    Timeline{sortIcon('timeline')}
                  </th>
                  <th className={sortKey === 'status' ? 'active' : ''} onClick={() => toggleSort('status')}>
                    Status{sortIcon('status')}
                  </th>
                  <th
                    className={sortKey === 'activity' ? 'active' : ''}
                    onClick={() => toggleSort('activity')}
                  >
                    Last Activity{sortIcon('activity')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((parent) => (
                  <DashboardRow key={parent.id} parent={parent} onNavigate={onNavigate} />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lw-dash-side">
          <div className="lw-dash-side-header">Trending Patterns</div>
          <div className="lw-dash-side-subhead">Last 30 Days</div>
          <div className="lw-dash-trend-list">
            {TRENDING.map((item, index) => (
              <div key={item.pattern} className="lw-dash-trend-item">
                <div className="lw-dash-trend-top">
                  <span className="lw-dash-trend-rank">{index + 1}.</span>
                  <span className="lw-dash-trend-pattern">{item.pattern}</span>
                </div>
                <div className="lw-dash-trend-meta">
                  {item.meta}{' '}
                  {item.isNew ? (
                    <span className="lw-dash-trend-new">new</span>
                  ) : (
                    <span className={item.trend === 'steady' ? '' : 'lw-dash-trend-up'}>
                      ({item.trend})
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button type="button" className="lw-dash-export-link">
            <Download size={14} />
            Export as CSV
          </button>
        </div>
      </div>
    </div>
  )
}

function DashboardRow({
  parent,
  onNavigate,
}: {
  parent: Parent
  onNavigate: (screen: string) => void
}) {
  const band = getScoreBand(parent.totalScore)
  const color = getBandColor(band)

  return (
    <tr onClick={() => onNavigate('parent-detail')}>
      <td className="lw-dash-td-name">{parent.name}</td>
      <td className="lw-dash-td-child">
        {parent.childName}, {parent.childAge}
      </td>
      <td>
        <span className="lw-dash-td-score">
          <span className="lw-dash-score-dot" style={{ backgroundColor: color.dot }} />
          {parent.totalScore}
        </span>
      </td>
      <td>
        <span className="lw-dash-band-pill" style={{ backgroundColor: color.bg, color: color.text }}>
          <span className="lw-dash-band-pill-dot" style={{ backgroundColor: color.dot }} />
          {getBandLabel(band)}
        </span>
      </td>
      <td className="lw-dash-td-timeline">{parent.timeline}</td>
      <td className="lw-dash-td-status">{formatStatus(parent.status)}</td>
      <td className="lw-dash-td-activity">{parent.lastUpdatedDisplay}</td>
    </tr>
  )
}

function formatStatus(status: string): string {
  return status
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

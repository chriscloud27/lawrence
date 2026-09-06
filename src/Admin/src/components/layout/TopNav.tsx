import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme, type Theme } from '../../context/ThemeContext'

export type Portal = 'parent' | 'agency'

interface TopNavProps {
  activePortal: Portal
  onPortalChange: (portal: Portal) => void
}

const THEME_OPTIONS: { value: Theme; icon: typeof Sun }[] = [
  { value: 'light', icon: Sun },
  { value: 'dark', icon: Moon },
  { value: 'auto', icon: Monitor },
]

export function TopNav({ activePortal, onPortalChange }: TopNavProps) {
  const { theme, setTheme } = useTheme()

  return (
    <div className="lw-topnav">
      <div className="lw-topnav-brand">
        <div className="lw-topnav-mark">L</div>
        <span className="lw-topnav-wordmark">Lawrence</span>
      </div>

      <div className="lw-topnav-portals">
        {(
          [
            { id: 'parent', label: 'Parent Portal' },
            { id: 'agency', label: 'Agency Dashboard' },
          ] as { id: Portal; label: string }[]
        ).map((tab) => {
          const isActive = activePortal === tab.id
          return (
            <button
              key={tab.id}
              className="lw-topnav-portal-btn"
              onClick={() => onPortalChange(tab.id)}
              style={{
                borderBottom: isActive ? '2px solid var(--lw-accent)' : '2px solid transparent',
                color: isActive ? 'var(--lw-accent)' : 'var(--lw-text-muted)',
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      <div className="lw-topnav-right">
        <div className="lw-topnav-theme-group">
          {THEME_OPTIONS.map(({ value, icon: Icon }) => {
            const isActive = theme === value
            return (
              <button
                key={value}
                className="lw-topnav-theme-btn"
                onClick={() => setTheme(value)}
                aria-label={value}
                style={{
                  backgroundColor: isActive ? 'var(--lw-accent-subtle)' : 'transparent',
                  color: isActive ? 'var(--lw-accent)' : 'var(--lw-text-muted)',
                }}
              >
                <Icon size={16} />
              </button>
            )
          })}
        </div>
        <div className="lw-topnav-avatar" />
      </div>

      <style>{`
        .lw-topnav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 56px;
          padding: 0 24px;
          flex-shrink: 0;
          background-color: var(--lw-bg);
          border-bottom: 1px solid var(--lw-border);
        }
        .lw-topnav-brand { display: flex; align-items: center; gap: 10px; }
        .lw-topnav-mark {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: var(--radius-sm);
          background-color: var(--lw-accent);
          color: var(--lw-text-on-accent);
          font-family: var(--font-sans);
          font-weight: 600;
          font-size: 16px;
        }
        .lw-topnav-wordmark {
          font-family: var(--font-sans);
          font-weight: 600;
          font-size: 18px;
          color: var(--lw-text);
        }
        .lw-topnav-portals { display: flex; gap: 32px; }
        .lw-topnav-portal-btn {
          background: none;
          border: none;
          padding: 8px 0;
          white-space: nowrap;
          font-family: var(--font-sans);
          font-weight: 500;
          font-size: 14px;
          cursor: pointer;
        }
        .lw-topnav-right { display: flex; align-items: center; gap: 12px; }
        .lw-topnav-theme-group { display: flex; gap: 4px; }
        .lw-topnav-theme-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border: none;
          border-radius: var(--radius-sm);
          cursor: pointer;
        }
        .lw-topnav-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background-color: var(--lw-bg-card);
        }

        @media (max-width: 767px) {
          .lw-topnav {
            height: auto;
            flex-wrap: wrap;
            row-gap: 4px;
            padding: 8px 16px;
          }
          .lw-topnav-portals {
            order: 3;
            width: 100%;
            gap: 20px;
          }
          .lw-topnav-portal-btn { min-height: 48px; }
          .lw-topnav-theme-btn { width: 48px; height: 48px; }
        }
      `}</style>
    </div>
  )
}

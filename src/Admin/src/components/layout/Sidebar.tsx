import type { LucideIcon } from 'lucide-react'

export interface SidebarItem {
  id: string
  label: string
  icon: LucideIcon
}

interface SidebarProps {
  items: SidebarItem[]
  activeItem: string
  onItemChange: (id: string) => void
}

export function Sidebar({ items, activeItem, onItemChange }: SidebarProps) {
  return (
    <>
      <div
        className="lw-sidebar-vertical"
        style={{
          width: '220px',
          flexShrink: 0,
          backgroundColor: 'var(--lw-bg)',
          borderRight: '1px solid var(--lw-border)',
          padding: '12px 8px',
        }}
      >
        {items.map((item) => (
          <SidebarRow
            key={item.id}
            item={item}
            isActive={item.id === activeItem}
            onClick={() => onItemChange(item.id)}
          />
        ))}
      </div>

      <div
        className="lw-sidebar-horizontal"
        style={{
          overflowX: 'auto',
          gap: '8px',
          padding: '8px 12px',
          backgroundColor: 'var(--lw-bg)',
          borderBottom: '1px solid var(--lw-border)',
        }}
      >
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onItemChange(item.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flexShrink: 0,
              minHeight: '48px',
              padding: '6px 14px',
              borderRadius: '999px',
              border: 'none',
              fontFamily: 'var(--font-sans)',
              fontWeight: 400,
              fontSize: '14px',
              backgroundColor: item.id === activeItem ? 'var(--lw-accent-subtle)' : 'transparent',
              color: item.id === activeItem ? 'var(--lw-accent)' : 'var(--lw-text-secondary)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <item.icon size={18} />
            {item.label}
          </button>
        ))}
      </div>

      <style>{`
        .lw-sidebar-vertical { display: block; }
        .lw-sidebar-horizontal { display: none; }
        @media (max-width: 767px) {
          .lw-sidebar-vertical { display: none; }
          .lw-sidebar-horizontal { display: flex; }
        }
      `}</style>
    </>
  )
}

function SidebarRow({
  item,
  isActive,
  onClick,
}: {
  item: SidebarItem
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        width: '100%',
        padding: '8px 12px',
        border: 'none',
        borderRadius: 'var(--radius-sm)',
        backgroundColor: isActive ? 'var(--lw-accent-subtle)' : 'transparent',
        color: isActive ? 'var(--lw-accent)' : 'var(--lw-text-secondary)',
        fontFamily: 'var(--font-sans)',
        fontWeight: 400,
        fontSize: '14px',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <item.icon size={20} />
      {item.label}
    </button>
  )
}

import {
  ClipboardList,
  Upload,
  User,
  LayoutDashboard,
  UserCheck,
  Settings,
  CalendarCheck,
} from 'lucide-react'
import { TopNav, type Portal } from './TopNav'
import { Sidebar, type SidebarItem } from './Sidebar'
import { IntakeForm } from '../../screens/IntakeForm'
import { DocumentUpload } from '../../screens/DocumentUpload'
import { NextStep } from '../../screens/NextStep'
import { SearchProfile } from '../../screens/SearchProfile'
import { Dashboard } from '../../screens/Dashboard'
import { ParentDetail } from '../../screens/ParentDetail'
import { FormBuilder } from '../../screens/FormBuilder'

const PARENT_ITEMS: SidebarItem[] = [
  { id: 'intake-form', label: 'Intake Form', icon: ClipboardList },
  { id: 'document-upload', label: 'Document Upload', icon: Upload },
  { id: 'next-step', label: 'Next Step', icon: CalendarCheck },
  { id: 'search-profile', label: 'My Search Profile', icon: User },
]

const AGENCY_ITEMS: SidebarItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'parent-detail', label: 'Parent Detail', icon: UserCheck },
  { id: 'form-builder', label: 'Form Builder', icon: Settings },
]

interface MainLayoutProps {
  activePortal: Portal
  onPortalChange: (portal: Portal) => void
  activeScreen: string
  onScreenChange: (screen: string) => void
  selectedParentId: string | null
  onSelectParent: (id: string) => void
}

export function MainLayout({
  activePortal,
  onPortalChange,
  activeScreen,
  onScreenChange,
  selectedParentId,
  onSelectParent,
}: MainLayoutProps) {
  const items = activePortal === 'parent' ? PARENT_ITEMS : AGENCY_ITEMS
  const activeItem = items.find((item) => item.id === activeScreen)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <TopNav activePortal={activePortal} onPortalChange={onPortalChange} />
      <div className="lw-shell-body" style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <Sidebar items={items} activeItem={activeScreen} onItemChange={onScreenChange} />
        <div className="lw-shell-content" style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
          {activeScreen === 'intake-form' ? (
            <IntakeForm onNavigate={onScreenChange} />
          ) : activeScreen === 'document-upload' ? (
            <DocumentUpload onNavigate={onScreenChange} />
          ) : activeScreen === 'next-step' ? (
            <NextStep onNavigate={onScreenChange} />
          ) : activeScreen === 'search-profile' ? (
            <SearchProfile />
          ) : activeScreen === 'dashboard' ? (
            <Dashboard onNavigate={onScreenChange} onSelectParent={onSelectParent} />
          ) : activeScreen === 'parent-detail' ? (
            <ParentDetail onNavigate={onScreenChange} parentId={selectedParentId} />
          ) : activeScreen === 'form-builder' ? (
            <FormBuilder />
          ) : (
            <div
              style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-sans)',
                fontSize: '16px',
                color: 'var(--lw-text-muted)',
              }}
            >
              {activeItem?.label ?? ''}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 767px) {
          .lw-shell-body { flex-direction: column; }
        }
      `}</style>
    </div>
  )
}

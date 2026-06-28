import type { Lead } from '@/db/schema';
import Link from 'next/link';

const TIER_STYLES = {
  hot: { bg: '#FAECE7', text: '#712B13', border: '#993C1D', label: 'Hot' },
  warm: { bg: '#FAEEDA', text: '#633806', border: '#854F0B', label: 'Warm' },
  cold: { bg: '#E1F5EE', text: '#085041', border: '#0F6E56', label: 'Cold' },
};

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-purple-100 text-purple-700',
  booked: 'bg-green-100 text-green-700',
  nurture: 'bg-gray-100 text-gray-600',
  closed: 'bg-gray-200 text-gray-500',
};

interface LeadRowProps {
  lead: Lead;
}

export default function LeadRow({ lead }: LeadRowProps) {
  const tier = TIER_STYLES[lead.classification || 'cold'];
  const statusStyle = STATUS_STYLES[lead.status] || 'bg-gray-100 text-gray-600';

  const summary = [lead.location, lead.curriculum, lead.timeline]
    .filter(Boolean)
    .join(' · ') || 'No details yet';

  const date = new Date(lead.createdAt).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  return (
    <Link href={`/admin/leads/${lead.id}`}>
      <div
        className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-100 last:border-0"
      >
        {/* Score badge */}
        <div
          className="w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 border"
          style={{ background: tier.bg, borderColor: tier.border }}
        >
          <span className="text-lg font-bold leading-none" style={{ color: tier.text }}>{lead.score}</span>
          <span className="text-[10px] font-medium mt-0.5" style={{ color: tier.text }}>{tier.label}</span>
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-900 truncate">
              {lead.capturedName || 'Anonymous'}
            </p>
          </div>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{summary}</p>
        </div>

        {/* Right side */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusStyle}`}>
            {lead.status}
          </span>
          <span className="text-xs text-gray-400">{date}</span>
        </div>
      </div>
    </Link>
  );
}

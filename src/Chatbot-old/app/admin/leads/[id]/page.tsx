'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Lead, Message } from '@/db/schema';
import Link from 'next/link';

const TIER_STYLES = {
  hot: { bg: '#FAECE7', text: '#712B13', border: '#993C1D' },
  warm: { bg: '#FAEEDA', text: '#633806', border: '#854F0B' },
  cold: { bg: '#E1F5EE', text: '#085041', border: '#0F6E56' },
};

interface LeadDetail extends Lead {
  messages: Message[];
}

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [overriding, setOverriding] = useState(false);

  const fetchLead = async (pw: string) => {
    const res = await fetch(`/api/leads/${params.id}`, {
      headers: { 'x-admin-password': pw },
    });
    if (res.ok) {
      const data = await res.json();
      setLead(data.lead);
      setAuthed(true);
    } else {
      setAuthed(false);
    }
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await fetchLead(password);
  };

  const overrideClassification = async (classification: string) => {
    setOverriding(true);
    await fetch('/api/leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
      body: JSON.stringify({ id: params.id, classification }),
    });
    await fetchLead(password);
    setOverriding(false);
  };

  if (!authed && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-sm">
          <h1 className="text-xl font-semibold text-center mb-4">Enter password</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#712B13]/30"
              autoFocus
            />
            <button type="submit" className="w-full bg-[#712B13] text-white py-2.5 rounded-xl text-sm font-medium">
              Sign in
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loading || !lead) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  const tier = TIER_STYLES[lead.classification || 'cold'];
  const breakdown = lead.scoreBreakdown as Record<string, number> | null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <Link href="/admin/leads" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to leads
        </Link>

        {/* Lead header */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{lead.capturedName || 'Anonymous'}</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {[lead.location, lead.curriculum, lead.timeline].filter(Boolean).join(' · ')}
              </p>
            </div>
            <div
              className="px-4 py-2 rounded-xl text-center border"
              style={{ background: tier.bg, borderColor: tier.border }}
            >
              <div className="text-2xl font-bold" style={{ color: tier.text }}>{lead.score}</div>
              <div className="text-xs font-medium capitalize" style={{ color: tier.text }}>
                {lead.classification || 'unscored'}
              </div>
            </div>
          </div>

          {/* Score breakdown */}
          {breakdown && (
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Score breakdown</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(breakdown).filter(([k]) => k !== 'total' && (breakdown[k] || 0) > 0).map(([key, val]) => (
                  <span key={key} className="text-xs bg-white border border-gray-200 px-2 py-1 rounded-lg text-gray-700">
                    {key.replace(/_/g, ' ')}: +{val}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Override */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Override classification</p>
            <div className="flex gap-2">
              {(['hot', 'warm', 'cold'] as const).map(c => (
                <button
                  key={c}
                  onClick={() => overrideClassification(c)}
                  disabled={overriding || lead.classification === c}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all disabled:opacity-50"
                  style={lead.classification === c
                    ? { background: TIER_STYLES[c].bg, color: TIER_STYLES[c].text, borderColor: TIER_STYLES[c].border }
                    : { background: 'white', color: '#6b7280', borderColor: '#e5e7eb' }
                  }
                >
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Transcript */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">Conversation</h2>
          <div className="space-y-3">
            {lead.messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                    msg.role === 'user'
                      ? 'bg-[#712B13] text-white rounded-tr-sm'
                      : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

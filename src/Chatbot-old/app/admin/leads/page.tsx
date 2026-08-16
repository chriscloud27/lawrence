'use client';

import { useState, useEffect } from 'react';
import LeadRow from '@/components/inbox/LeadRow';
import LeadFilter from '@/components/inbox/LeadFilter';
import type { Lead } from '@/db/schema';

export default function LeadsPage() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/leads', {
      headers: { 'x-admin-password': password },
    });
    if (res.ok) {
      const data = await res.json();
      setLeads(data.leads);
      setAuthed(true);
    } else {
      setError('Incorrect password');
    }
    setLoading(false);
  };

  const fetchLeads = async () => {
    const res = await fetch('/api/leads', {
      headers: { 'x-admin-password': password },
    });
    if (res.ok) {
      const data = await res.json();
      setLeads(data.leads);
    }
  };

  useEffect(() => {
    if (authed) {
      const interval = setInterval(fetchLeads, 10000);
      return () => clearInterval(interval);
    }
  }, [authed]);

  const filtered = filter === 'all' ? leads : leads.filter(l => l.classification === filter);
  const counts = {
    all: leads.length,
    hot: leads.filter(l => l.classification === 'hot').length,
    warm: leads.filter(l => l.classification === 'warm').length,
    cold: leads.filter(l => l.classification === 'cold').length,
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-sm">
          <div className="w-10 h-10 rounded-xl bg-[#712B13] flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-sm">ITS</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 text-center mb-1">Lead Inbox</h1>
          <p className="text-sm text-gray-500 text-center mb-6">Enter your password to continue</p>
          <form onSubmit={login} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#712B13]/30 focus:border-[#712B13]"
              autoFocus
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#712B13] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#993C1D] transition-colors disabled:opacity-50"
            >
              {loading ? 'Checking...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Your leads</h1>
            <p className="text-sm text-gray-500 mt-0.5">{leads.length} total conversations</p>
          </div>
          <button
            onClick={fetchLeads}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Legend */}
        <div className="flex gap-3 mb-4">
          {[
            { label: 'Hot', bg: '#FAECE7', text: '#712B13', border: '#993C1D' },
            { label: 'Warm', bg: '#FAEEDA', text: '#633806', border: '#854F0B' },
            { label: 'Cold', bg: '#E1F5EE', text: '#085041', border: '#0F6E56' },
          ].map(t => (
            <div
              key={t.label}
              className="px-3 py-1 rounded-lg text-xs font-medium border"
              style={{ background: t.bg, color: t.text, borderColor: t.border }}
            >
              {t.label}
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="mb-4">
          <LeadFilter active={filter} onChange={setFilter} counts={counts} />
        </div>

        {/* Lead list */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <p className="text-sm">No leads yet</p>
              <p className="text-xs mt-1">Conversations will appear here as parents chat</p>
            </div>
          ) : (
            filtered.map(lead => <LeadRow key={lead.id} lead={lead} />)
          )}
        </div>
      </div>
    </div>
  );
}

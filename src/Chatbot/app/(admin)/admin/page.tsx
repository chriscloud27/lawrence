// Agency dashboard. Server Component: the rows come from Supabase through RLS,
// and only the filter/sort/search interaction below it needs the browser.

import { listLeads } from "@/lib/leads";
import { getScoreBand } from "@/lib/score";
import type { ScoreBand } from "@/types/lawrence";
import { LeadsTable } from "@/components/admin/LeadsTable";

export const metadata = { title: "Dashboard" };

// Never cache: a counsellor's view of their own pipeline must not be stale, and
// the rows are per-user anyway.
export const dynamic = "force-dynamic";

const BANDS: ScoreBand[] = ["cold", "warm", "qualified", "hot"];

function topValues(values: (string | null)[], limit: number) {
  const counts = new Map<string, number>();
  for (const value of values) {
    const key = value?.trim();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

export default async function DashboardPage() {
  const leads = await listLeads();

  const kpis = [
    { title: "New Parents", value: String(leads.filter((l) => l.status === "new").length) },
    {
      title: "Hot Leads",
      value: String(leads.filter((l) => getScoreBand(l.score) === "hot").length),
    },
    {
      title: "Avg Score",
      value: leads.length
        ? `${Math.round(leads.reduce((sum, l) => sum + l.score, 0) / leads.length)}/100`
        : "—",
    },
    { title: "Total Leads", value: String(leads.length) },
  ];

  const distribution = BANDS.map((band) => {
    const count = leads.filter((l) => getScoreBand(l.score) === band).length;
    return { band, count, pct: leads.length ? Math.round((count / leads.length) * 100) : 0 };
  });

  // Real aggregates over the agency's own rows. The old mock dashboard showed
  // invented "trending patterns" and week-on-week deltas; with six static rows
  // and no history table those were fiction, so they are not ported.
  const topCurricula = topValues(leads.map((l) => l.curriculum), 5);
  const topLocations = topValues(leads.map((l) => l.location), 5);

  return (
    <div className="w-full p-lw-xl max-[640px]:px-lw-base max-[640px]:pt-lw-lg max-[640px]:pb-lw-2xl">
      <div className="flex gap-lw-md max-[640px]:flex-wrap">
        {kpis.map((card) => (
          <div key={card.title} className="flex-1 rounded-lw-lg bg-lw-bg-card p-lw-lg max-[640px]:basis-[calc(50%-6px)]">
            <div className="text-[13px] font-medium uppercase tracking-[0.02em] text-lw-text-muted">
              {card.title}
            </div>
            <div className="mt-lw-sm font-mono text-[28px] text-lw-text">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-lw-lg max-[1023px]:flex-col">
        <div className="min-w-0 flex-auto">
          <LeadsTable leads={leads} distribution={distribution} />
        </div>

        <aside className="w-[280px] shrink-0 rounded-lw-lg bg-lw-bg-card p-lw-lg max-[1023px]:w-full">
          <div className="text-base font-semibold text-lw-text">Across your leads</div>
          <div className="mt-[2px] text-[13px] text-lw-text-muted">
            Counted from this agency&apos;s rows
          </div>

          <AggregateList title="Curriculum" items={topCurricula} />
          <AggregateList title="Location" items={topLocations} />
        </aside>
      </div>
    </div>
  );
}

function AggregateList({ title, items }: { title: string; items: { label: string; count: number }[] }) {
  return (
    <div className="mt-lw-base">
      <div className="text-[13px] font-semibold uppercase tracking-[0.02em] text-lw-text-muted">
        {title}
      </div>
      {items.length === 0 ? (
        <div className="py-lw-md text-[13px] text-lw-text-muted">No data yet</div>
      ) : (
        items.map((item) => (
          <div
            key={item.label}
            className="flex items-baseline justify-between gap-lw-sm border-b border-lw-border-subtle py-lw-md last:border-b-0"
          >
            <span className="min-w-0 truncate text-sm text-lw-text">{item.label}</span>
            <span className="shrink-0 font-mono text-[13px] text-lw-text-muted">{item.count}</span>
          </div>
        ))
      )}
    </div>
  );
}

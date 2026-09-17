"use client";

// The dashboard's filter / sort / search surface. Client only because of the
// interaction — the rows themselves are fetched on the server and passed in.

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ChevronUp, ChevronDown, Download } from "lucide-react";
import type { Lead, LeadStatus, ScoreBand } from "@/types/lawrence";
import { formatLeadStatus, getBandClasses, getBandLabel, getScoreBand } from "@/lib/score";
import { BandPill, ScoreValue } from "@/components/admin/BandPill";
import { INPUT_BASE, LINK_BTN, SELECT, TABLE_HEAD } from "@/components/admin/ui";

type SortKey = "name" | "age" | "score" | "band" | "timeline" | "status" | "created";

const BANDS: ScoreBand[] = ["cold", "warm", "qualified", "hot"];
const STATUSES: LeadStatus[] = ["new", "contacted", "booked", "nurture", "closed"];

interface Segment {
  band: ScoreBand;
  count: number;
  pct: number;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function LeadsTable({ leads, distribution }: { leads: Lead[]; distribution: Segment[] }) {
  const router = useRouter();
  const [bandFilter, setBandFilter] = useState<ScoreBand | "all">("all");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();

    const filtered = leads.filter((lead) => {
      if (bandFilter !== "all" && getScoreBand(lead.score) !== bandFilter) return false;
      if (statusFilter !== "all" && lead.status !== statusFilter) return false;
      if (
        needle &&
        !(lead.captured_name ?? "").toLowerCase().includes(needle) &&
        !(lead.captured_email ?? "").toLowerCase().includes(needle)
      ) {
        return false;
      }
      return true;
    });

    const dir = sortDir === "asc" ? 1 : -1;
    const text = (value: string | null) => value ?? "";

    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return text(a.captured_name).localeCompare(text(b.captured_name)) * dir;
        case "age":
          return ((a.child_age ?? 0) - (b.child_age ?? 0)) * dir;
        case "score":
          return (a.score - b.score) * dir;
        case "band":
          return (BANDS.indexOf(getScoreBand(a.score)) - BANDS.indexOf(getScoreBand(b.score))) * dir;
        case "timeline":
          return text(a.timeline).localeCompare(text(b.timeline)) * dir;
        case "status":
          return a.status.localeCompare(b.status) * dir;
        case "created":
          return (Date.parse(a.created_at) - Date.parse(b.created_at)) * dir;
        default:
          return 0;
      }
    });
  }, [leads, bandFilter, statusFilter, search, sortKey, sortDir]);

  const exportCsv = () => {
    const header = ["id", "name", "email", "score", "band", "status", "timeline", "created_at"];
    const body = rows.map((lead) => [
      lead.id,
      lead.captured_name ?? "",
      lead.captured_email ?? "",
      String(lead.score),
      getBandLabel(getScoreBand(lead.score)),
      lead.status,
      lead.timeline ?? "",
      lead.created_at,
    ]);

    const csv = [header, ...body]
      .map((cells) => cells.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const sortIcon = (key: SortKey) =>
    sortKey === key ? (
      <span className="ml-1 inline-flex align-middle">
        {sortDir === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </span>
    ) : null;

  const headers: { key: SortKey; label: string }[] = [
    { key: "name", label: "Name" },
    { key: "age", label: "Child age" },
    { key: "score", label: "Score" },
    { key: "band", label: "Band" },
    { key: "timeline", label: "Timeline" },
    { key: "status", label: "Status" },
    { key: "created", label: "Captured" },
  ];

  return (
    <>
      <div className="mt-lw-lg mb-lw-md text-base font-semibold text-lw-text">Score Distribution</div>
      <div className="flex h-6 w-full overflow-hidden rounded-lw">
        {distribution.map((segment) => (
          <div
            key={segment.band}
            className={`h-full ${getBandClasses(segment.band).bg}`}
            style={{ width: `${segment.pct}%` }}
          />
        ))}
      </div>
      <div className="mt-[10px] flex flex-wrap gap-lw-base">
        {distribution.map((segment) => (
          <div
            key={segment.band}
            className="flex items-center gap-[6px] text-[13px] text-lw-text-secondary"
          >
            <span className={`h-2 w-2 shrink-0 rounded-full ${getBandClasses(segment.band).dot}`} />
            {getBandLabel(segment.band)}: {segment.count}
          </div>
        ))}
      </div>

      <div className="mt-lw-lg flex flex-wrap gap-[10px]">
        <select
          aria-label="Filter by score band"
          className={`${INPUT_BASE} w-[160px] shrink-0 max-[640px]:w-full`}
          value={bandFilter}
          onChange={(e) => setBandFilter(e.target.value as ScoreBand | "all")}
        >
          <option value="all">Score Band: All</option>
          {BANDS.map((band) => (
            <option key={band} value={band}>
              {getBandLabel(band)}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by status"
          className={`${INPUT_BASE} w-[160px] shrink-0 max-[640px]:w-full`}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as LeadStatus | "all")}
        >
          <option value="all">Status: All</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {formatLeadStatus(status)}
            </option>
          ))}
        </select>

        <div className="relative min-w-[200px] flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-lw-md top-1/2 -translate-y-1/2 text-lw-text-muted"
          />
          <input
            type="text"
            aria-label="Search leads"
            placeholder="Search by name or email"
            className={`${SELECT} pl-9`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-lw-md overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse">
          <thead>
            <tr>
              {headers.map((header) => (
                <th
                  key={header.key}
                  scope="col"
                  onClick={() => toggleSort(header.key)}
                  className={`${TABLE_HEAD} sticky top-0 cursor-pointer select-none whitespace-nowrap border-b border-lw-border-subtle bg-lw-bg ${
                    sortKey === header.key ? "text-lw-accent" : ""
                  }`}
                >
                  {header.label}
                  {sortIcon(header.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="p-lw-lg text-sm text-lw-text-muted">
                  No leads match these filters.
                </td>
              </tr>
            ) : (
              rows.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={() => router.push(`/admin/parents/${lead.id}`)}
                  className="cursor-pointer border-b border-lw-border-subtle bg-lw-bg hover:bg-lw-bg-subtle"
                >
                  <td className="p-lw-md text-sm font-medium text-lw-text">
                    <Link
                      href={`/admin/parents/${lead.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="hover:underline"
                    >
                      {lead.captured_name ?? "Unnamed"}
                    </Link>
                  </td>
                  <td className="p-lw-md text-sm text-lw-text-secondary">{lead.child_age ?? "—"}</td>
                  <td className="p-lw-md">
                    <ScoreValue score={lead.score} />
                  </td>
                  <td className="p-lw-md">
                    <BandPill score={lead.score} />
                  </td>
                  <td className="p-lw-md text-sm text-lw-text">{lead.timeline ?? "—"}</td>
                  <td className="p-lw-md text-[13px] text-lw-text-muted">
                    {formatLeadStatus(lead.status)}
                  </td>
                  <td className="p-lw-md text-[13px] text-lw-text-muted">
                    {formatDate(lead.created_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <button type="button" className={LINK_BTN} onClick={exportCsv}>
        <Download size={14} />
        Export as CSV
      </button>
    </>
  );
}

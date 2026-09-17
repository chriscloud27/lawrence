// Admin chrome and auth gate.
//
// Gate first: Admin is counsellor-facing and must not be reachable by a parent
// or by an anonymous visitor. RLS would return zero rows either way, but an
// empty dashboard is a confusing way to say "sign in".

import { redirect } from "next/navigation";
import { getCurrentAgency } from "@/lib/leads";
import { requireUser } from "@/lib/auth";
import { AdminNav } from "@/components/admin/AdminNav";
import { ThemeToggle } from "@/components/admin/ThemeToggle";
import { SignOutButton } from "@/components/admin/SignOutButton";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Same memoised check the data layer runs (lib/auth.ts) — one getUser() per
  // render pass, not two. The layout is the friendly redirect; lib/leads.ts is
  // the one that actually guards the query, because layout and page render
  // concurrently.
  const user = await requireUser();

  // Membership, not merely authentication: a signed-in parent has no agency.
  const agency = await getCurrentAgency();
  if (!agency) redirect("/sign-in?error=no-agency");

  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-14 shrink-0 flex-wrap items-center justify-between gap-y-1 border-b border-lw-border bg-lw-bg px-lw-lg max-[767px]:h-auto max-[767px]:px-lw-base max-[767px]:py-lw-sm">
        <div className="flex items-center gap-[10px]">
          <div className="flex h-8 w-8 items-center justify-center rounded-lw bg-lw-accent text-base font-semibold text-lw-text-on-accent">
            {agency.name.charAt(0)}
          </div>
          <span className="text-lg font-semibold text-lw-text">{agency.name}</span>
        </div>

        <div className="flex items-center gap-lw-md">
          <span className="text-[13px] text-lw-text-muted max-[767px]:hidden">{user.email}</span>
          <ThemeToggle />
          <SignOutButton />
        </div>
      </header>

      <div className="flex min-h-0 flex-1 max-[767px]:flex-col">
        <AdminNav />
        <main className="min-w-0 flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

"use client";

// Replaces MainLayout + Sidebar + TopNav from the Vite app. The portal switcher
// is gone: routes carry that now, and the parent-facing screens live under a
// lead rather than in a second top-level portal.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, MessageSquareCode, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Match nested routes too, but never let "/admin" swallow every path. */
  exact?: boolean;
}

const ITEMS: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/forms/form-001", label: "Form Builder", icon: Settings },
  { href: "/admin/settings", label: "Assistant", icon: MessageSquareCode },
];

function isActive(pathname: string, item: NavItem): boolean {
  // Prefix match on the item's own href, not a hardcoded one: with three items
  // a shared "/admin/forms" test lit the wrong tab.
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

export function AdminNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop rail */}
      <nav className="w-[220px] shrink-0 border-r border-lw-border bg-lw-bg px-lw-sm py-lw-md max-[767px]:hidden">
        {ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex w-full items-center gap-[10px] rounded-lw px-lw-md py-lw-sm text-sm ${
              isActive(pathname, item)
                ? "bg-lw-accent-subtle text-lw-accent"
                : "bg-transparent text-lw-text-secondary"
            }`}
          >
            <item.icon size={20} />
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Mobile strip */}
      <nav className="hidden gap-lw-sm overflow-x-auto border-b border-lw-border bg-lw-bg px-lw-md py-lw-sm max-[767px]:flex">
        {ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex min-h-12 shrink-0 items-center gap-[6px] whitespace-nowrap rounded-full px-[14px] py-[6px] text-sm ${
              isActive(pathname, item)
                ? "bg-lw-accent-subtle text-lw-accent"
                : "bg-transparent text-lw-text-secondary"
            }`}
          >
            <item.icon size={18} />
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  );
}

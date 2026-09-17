"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export function SignOutButton() {
  const router = useRouter();

  const signOut = async () => {
    await getSupabaseBrowserClient().auth.signOut();
    // refresh() so the layout's auth gate re-runs against the cleared cookies.
    router.refresh();
    router.push("/sign-in");
  };

  return (
    <button
      type="button"
      onClick={signOut}
      aria-label="Sign out"
      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lw text-lw-text-muted hover:bg-lw-bg-subtle hover:text-lw-text max-[767px]:h-12 max-[767px]:w-12"
    >
      <LogOut size={16} />
    </button>
  );
}

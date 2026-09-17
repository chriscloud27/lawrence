// Shared Tailwind class strings for the Admin surfaces.
//
// These replace src/Admin/src/styles/*.css. Every colour resolves through an
// lw-* utility (.claude/rules/design.md) — no raw hex, no Tailwind default
// palette class. Constants rather than a stylesheet so the token references
// stay greppable from the components that use them.

export const CARD = "rounded-lw-lg bg-lw-bg-card p-lw-lg";

export const SECTION_LABEL = "mt-lw-xl mb-lw-md text-base font-semibold text-lw-text";

export const FIELD_LABEL = "mb-[6px] block text-sm font-medium text-lw-text";

/** Width-free, so a caller can size it without fighting `w-full` — Tailwind
 *  resolves conflicting utilities by stylesheet order, not class order. */
export const INPUT_BASE =
  "h-10 rounded-lw bg-lw-bg-subtle px-lw-md text-sm text-lw-text " +
  "border border-lw-border outline-none transition-[border-color,box-shadow] " +
  "focus:border-lw-accent focus:shadow-lw-focus max-[560px]:h-12";

export const INPUT = `${INPUT_BASE} w-full`;

export const SELECT = INPUT;

export const TEXTAREA =
  "w-full resize-y rounded-lw bg-lw-bg-subtle px-lw-md py-[10px] text-sm text-lw-text " +
  "border border-lw-border outline-none transition-[border-color,box-shadow] " +
  "focus:border-lw-accent focus:shadow-lw-focus";

export const INPUT_ERROR = "border-lw-error";

/** Accent background: interactive only, never a section fill. */
export const BTN_PRIMARY =
  "inline-flex h-10 items-center justify-center gap-lw-sm rounded-lw bg-lw-accent " +
  "px-lw-base text-sm font-semibold text-lw-text-on-accent cursor-pointer " +
  "transition-colors hover:bg-lw-accent-hover disabled:pointer-events-none " +
  "disabled:opacity-50 max-[560px]:h-12";

export const BTN_SECONDARY =
  "inline-flex h-10 items-center justify-center gap-lw-sm rounded-lw border " +
  "border-lw-border bg-transparent px-lw-base text-sm font-semibold text-lw-text " +
  "cursor-pointer transition-colors hover:bg-lw-bg-subtle max-[560px]:h-12";

/** Text-only accent link. Min height 48px on touch, per DESIGN.md. */
export const LINK_BTN =
  "inline-flex items-center gap-[6px] bg-transparent py-lw-sm text-sm font-medium " +
  "text-lw-accent cursor-pointer max-[640px]:min-h-12";

export const CARD_WRAPPER =
  "mx-auto max-w-[560px] rounded-lw-lg border border-lw-border bg-lw-bg p-lw-xl " +
  "max-[560px]:px-lw-base max-[560px]:py-lw-lg";

export const FOOTER_NOTE = "mt-lw-base text-center text-[10px] text-lw-text-muted";

export const TABLE_HEAD =
  "px-lw-md py-[10px] text-left text-[13px] font-semibold uppercase tracking-[0.02em] " +
  "text-lw-text-muted";

export const PILL = "inline-flex items-center gap-[6px] rounded-full px-[10px] py-1 text-[13px] font-medium";

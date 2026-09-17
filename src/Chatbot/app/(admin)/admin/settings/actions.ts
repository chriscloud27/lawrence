"use server";

// The first counsellor WRITE in Admin — step 13 was read-only throughout.
//
// Both actions go through the cookie-bound client, so the owner-only RLS
// policies in the migration are what actually authorise the write. The
// `requireUser()` call is not the security boundary either; it is here so an
// expired session gets a redirect instead of a confusing RLS denial.
//
// Neither action ever UPDATEs `system_prompt`, `bant_thresholds`, or
// `routing_copy`. A save INSERTs a new version and moves the active flag. That
// is the whole difference between this and the n8n canvas it replaces: the row
// that was live at 16:59 still exists at 17:01.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSupabaseRequestClient } from "@/lib/supabase-server";
import { requireUser } from "@/lib/auth";

const ThresholdsSchema = z
  .object({
    low: z.coerce.number().int().min(0).max(100),
    medium: z.coerce.number().int().min(0).max(100),
    hot: z.coerce.number().int().min(0).max(100),
  })
  .refine((t) => t.low <= t.medium && t.medium <= t.hot, {
    message: "Thresholds must increase: qualifying ≤ booking ≤ escalation",
  })
  .refine((t) => t.low <= 67, {
    // ADR-0017: Stage 1 scores three dimensions whose keyword maxima cap at
    // 23/22/22. A gate above 67 can never fire, which is precisely the bug that
    // meant no lead ever escalated out of pre-qualification.
    message:
      "The qualifying gate cannot exceed 67 — Stage 1 cannot score higher than that",
  });

const SaveSchema = z.object({
  systemPrompt: z
    .string()
    .trim()
    .min(50, "A system prompt this short will not behave"),
  turnCapClose: z.string().trim().min(1),
  resources: z.string().trim().min(1),
  booking: z.string().trim().min(1),
});

export type ActionResult =
  { ok: true; version?: number } | { ok: false; error: string };

export async function saveAgentConfig(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await getSupabaseRequestClient();

  const fields = SaveSchema.safeParse({
    systemPrompt: formData.get("systemPrompt"),
    turnCapClose: formData.get("turnCapClose"),
    resources: formData.get("resources"),
    booking: formData.get("booking"),
  });
  if (!fields.success) {
    return { ok: false, error: fields.error.issues[0].message };
  }

  const thresholds = ThresholdsSchema.safeParse({
    low: formData.get("low"),
    medium: formData.get("medium"),
    hot: formData.get("hot"),
  });
  if (!thresholds.success) {
    return { ok: false, error: thresholds.error.issues[0].message };
  }

  // Read the current state through RLS, so the agency is whatever the signed-in
  // counsellor's membership resolves to — never a value from the form.
  const { data: current, error: readError } = await supabase
    .from("agent_config")
    .select("agency_id, version")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle<{ agency_id: string; version: number }>();

  if (readError) return { ok: false, error: readError.message };
  if (!current)
    return { ok: false, error: "No configuration exists for your agency yet." };

  const nextVersion = current.version + 1;

  // Deactivate first, then insert as active. The partial unique index allows
  // only one active row per agency, so doing it the other way round is a
  // constraint violation rather than a race.
  const { error: deactivateError } = await supabase
    .from("agent_config")
    .update({ is_active: false })
    .eq("agency_id", current.agency_id)
    .eq("is_active", true);

  if (deactivateError) return { ok: false, error: deactivateError.message };

  const { error: insertError } = await supabase.from("agent_config").insert({
    agency_id: current.agency_id,
    system_prompt: fields.data.systemPrompt,
    bant_thresholds: thresholds.data,
    routing_copy: {
      turn_cap_close: fields.data.turnCapClose,
      resources: fields.data.resources,
      booking: fields.data.booking,
    },
    version: nextVersion,
    created_by: user.id,
    is_active: true,
  });

  if (insertError) return { ok: false, error: insertError.message };

  revalidatePath("/admin/settings");
  return { ok: true, version: nextVersion };
}

export async function revertAgentConfig(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireUser();
  const supabase = await getSupabaseRequestClient();

  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return { ok: false, error: "Invalid version." };

  const { data: target, error: readError } = await supabase
    .from("agent_config")
    .select("agency_id, version")
    .eq("id", id.data)
    .maybeSingle<{ agency_id: string; version: number }>();

  // RLS makes another agency's row invisible, so "not found" and "not yours"
  // are the same answer here — which is the correct thing to tell the caller.
  if (readError) return { ok: false, error: readError.message };
  if (!target) return { ok: false, error: "That version does not exist." };

  const { error: deactivateError } = await supabase
    .from("agent_config")
    .update({ is_active: false })
    .eq("agency_id", target.agency_id)
    .eq("is_active", true);

  if (deactivateError) return { ok: false, error: deactivateError.message };

  const { error: activateError } = await supabase
    .from("agent_config")
    .update({ is_active: true })
    .eq("id", id.data);

  if (activateError) return { ok: false, error: activateError.message };

  revalidatePath("/admin/settings");
  return { ok: true, version: target.version };
}

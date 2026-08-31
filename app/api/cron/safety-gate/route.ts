import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { isoDateFromEuropean, parseSafetyGateAlerts, parseSafetyGateReportList, safetyGateReportListUrl, type SafetyGateAlert } from "@/lib/safety-gate";
import { readBearerRuntimeSecret } from "@/lib/runtime-secret";
import type { Database, Json } from "@/lib/supabase/database.types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const maxXmlBytes = 8_000_000;

async function fetchOfficialXml(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "application/xml,text/xml;q=0.9" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Safety Gate a répondu ${response.status}.`);
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > maxXmlBytes) throw new Error("Le flux Safety Gate dépasse la taille autorisée.");
  const xml = await response.text();
  if (xml.length > maxXmlBytes || !xml.includes("<Safety-Gate")) throw new Error("Le flux Safety Gate reçu est invalide.");
  return xml;
}

export async function GET(request: Request) {
  const cronSecret = readBearerRuntimeSecret(request.headers.get("authorization"));
  if (!cronSecret) {
    return NextResponse.json({ ok: false, error: "Accès refusé." }, { status: 401 });
  }

  try {
    const { url, publishableKey } = getSupabaseConfig();
    const supabase = createClient<Database>(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: secretAccepted, error: secretError } = await supabase.rpc("verify_runtime_secret", {
      p_name: "safety_gate_cron",
      p_secret: cronSecret,
    });
    if (secretError) {
      console.error("Safety Gate secret verification failed", secretError.code);
      return NextResponse.json({ ok: false, error: "Synchronisation temporairement indisponible." }, { status: 503 });
    }
    if (!secretAccepted) return NextResponse.json({ ok: false, error: "Accès refusé." }, { status: 401 });

    const reports = parseSafetyGateReportList(await fetchOfficialXml(safetyGateReportListUrl), 2);
    if (!reports.length) throw new Error("Aucun rapport Safety Gate officiel exploitable.");
    const alertsByReference = new Map<string, SafetyGateAlert>();
    for (const report of reports) {
      for (const alert of parseSafetyGateAlerts(await fetchOfficialXml(report.url))) alertsByReference.set(alert.reference, alert);
    }
    const latest = reports[0];
    const { data, error } = await supabase.rpc("sync_safety_gate_alerts", {
      p_secret: cronSecret,
      p_report_reference: reports.map((report) => report.reference).join(", "),
      p_report_date: isoDateFromEuropean(latest.publicationDate),
      p_alerts: [...alertsByReference.values()] as unknown as Json,
    });
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, reports: reports.map((report) => report.reference), alerts: alertsByReference.size, result: data });
  } catch (caught) {
    console.error("Safety Gate sync failed", caught instanceof Error ? caught.message : caught);
    return NextResponse.json({ ok: false, error: "La synchronisation Safety Gate a échoué." }, { status: 502 });
  }
}

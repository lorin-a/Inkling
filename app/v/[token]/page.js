import { sql } from "@/lib/db";
import { notFound } from "next/navigation";
import HostedBrand from "./HostedBrand";

export const dynamic = "force-dynamic";

export default async function VoterPage({ params }) {
  const { token } = await params;

  const rows = await sql.query(
    `SELECT id, audience, vote_unit, project_state, created_at
     FROM instances WHERE slug = $1 LIMIT 1`,
    [token]
  );

  if (rows.length === 0) notFound();

  const instance = rows[0];
  const state = instance.project_state || {};

  return (
    <HostedBrand
      token={token}
      audience={instance.audience}
      voteUnit={instance.vote_unit}
      project={state.project || {}}
      library={state.library || {}}
      marks={Array.isArray(state.marks) ? state.marks : []}
      presets={Array.isArray(state.presets) ? state.presets : []}
    />
  );
}

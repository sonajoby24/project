import { executeRetrievalPlan } from "./orchestrator";
import { buildEvidence } from "../evidenceBuilder";

export async function retrieveEvidence(
  query: string,
  plan: any
) {

  console.log("=================================");
  console.log("RETRIEVAL PLAN");
  console.log(JSON.stringify(plan, null, 2));
  console.log("=================================");

  // Execute the planner's retrieval plan
  const retrievalResult =
    await executeRetrievalPlan(
      query,
      plan
    );

  // Convert retrieved data into Evidence
  const evidence =
    buildEvidence(retrievalResult);

  return evidence;

}
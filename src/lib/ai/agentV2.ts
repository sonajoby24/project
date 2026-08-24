import { rewriteQuery } from "./queryRewriter";
import { createPlan } from "./planner/planner";
import { retrieveEvidence } from "./retrieval/retrieval";
import { runReasoner } from "./reasoning/reasoner";
import { validateEvidence } from "./validation/validator";
import { formatAnswer } from "./formatter/formatter";

export async function runAgentV2(
    userMessage: string,
    history: any[]
){

    // Step 1
    const rewrittenQuery =
        rewriteQuery(userMessage);

    // Step 2
    const plan =
        await createPlan(rewrittenQuery);

    // Step 3
    const evidence =
        await retrieveEvidence(
            rewrittenQuery,
            plan
        );

    // Step 4
    const reasoning =
        await runReasoner(
            userMessage,
            evidence,
            plan
        );

    // Step 5
    const validated =
        validateEvidence(
            reasoning,
            evidence
        );

    // Step 6
    return formatAnswer(
        validated
    );

}
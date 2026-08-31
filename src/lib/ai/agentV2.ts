import { rewriteQuery } from "./queryRewriter";
import { understandQuestion } from "./nlu";
import { createPlan } from "./planner/planner";
import { retrieveEvidence } from "./retrieval/retrieval";
import { runReasoner } from "./reasoning/reasoner";
import { validateEvidence } from "./validation/validator";
import { formatAnswer } from "./formatter/formatter";

export async function runAgentV2(
    userMessage: string,
    history: any[]
) {
    // Step 1: Rewrite the user's query
    const rewrittenQuery =
        rewriteQuery(userMessage);

    // Step 2: Understand the user's query using NLU
    const nlu =
        await understandQuestion(
            userMessage
        );

    // Step 3: Create the retrieval plan
    const plan =
        await createPlan(
            rewrittenQuery,
            nlu
        );

    // Step 4: Retrieve relevant evidence
    const evidence =
        await retrieveEvidence(
            rewrittenQuery,
            plan
        );

    // Step 5: Run reasoning over the retrieved evidence
    const reasoning =
        await runReasoner(
            userMessage,
            evidence,
            plan
        );

    // Step 6: Validate the reasoning/evidence
    const validated =
        validateEvidence(
            reasoning,
            evidence
        );

    // Step 7: Format the final answer
    return formatAnswer(
        validated
    );
}
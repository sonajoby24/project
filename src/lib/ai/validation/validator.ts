export function validateEvidence(

    reasoning: any,

    evidence: any

){

    if(!reasoning){

        return {

            answer:"No answer.",

            confidence:0

        };

    }

    if(reasoning.confidence < 0.50){

        reasoning.answer =

        "I don't have enough evidence to answer confidently.";

    }

    return reasoning;

}
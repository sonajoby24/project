export function formatAnswer(

    result:any

){

    return {

        answer: result.answer,

        confidence: result.confidence,

        reasoning: result.reasoning,

        citations: result.citations

    };

}
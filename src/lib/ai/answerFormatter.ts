export function formatAnswer(answer: string) {

  if (!answer) {

    return "No response generated.";

  }

  return answer
    .replace(/\n{3,}/g, "\n\n")
    .trim();

}
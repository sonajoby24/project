import OpenAI from "openai";

const client = new OpenAI({

    baseURL: "https://openrouter.ai/api/v1",

    apiKey: process.env.OPENROUTER_API_KEY

});

export async function createEmbedding(text: string) {

    const response =
        await client.embeddings.create({

            model: "text-embedding-3-small",

            input: text

        });

    return response.data[0].embedding;

}
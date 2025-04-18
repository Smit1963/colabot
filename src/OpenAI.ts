import { Configuration, OpenAIApi } from "openai";
import { type Settings } from "./types";

export async function OpenAIStream(
  selectedText: string,
  llmSettings: Settings
): Promise<string> {
  const configuration = new Configuration({
    apiKey: llmSettings.apiKey,
    organization: llmSettings.organizationId,
  });
  const openai = new OpenAIApi(configuration);

  try {
    const completion = await openai.createChatCompletion({
      messages: [{ role: "user", content: selectedText }],
      model: llmSettings.model ?? "gpt-3.5-turbo",
      temperature: llmSettings.temperature,
      top_p: llmSettings.top_p,
      stream: false,
      max_tokens: llmSettings.max_tokens,
      frequency_penalty: llmSettings.frequency_penalty,
      presence_penalty: llmSettings.presence_penalty,
      n: llmSettings.n,
    });

    return completion.data.choices[0]?.message?.content ?? "";
  } catch (error) {
    const errorAsAny = error as any;
    if (errorAsAny.code === "ENOTFOUND") {
      throw new Error(
        `Error connecting to ${errorAsAny.hostname} (${errorAsAny.syscall}). Are you connected to the internet?`
      );
    }

    throw errorAsAny.message;
  }
}

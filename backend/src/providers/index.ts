import { AIProvider } from "./AIProvider";
import { MockProvider } from "./MockProvider";
import { OpenRouterProvider } from "./OpenRouterProvider";

export function getProvider(): AIProvider {
  const useMock = process.env.USE_MOCK_AI === "true";

  if (useMock) {
    return new MockProvider();
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn("[YurKontour] OPENROUTER_API_KEY not set, falling back to mock provider");
    return new MockProvider();
  }

  const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
  return new OpenRouterProvider(apiKey, model);
}

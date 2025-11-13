import { ChatOpenAI } from "@langchain/openai";
import { OpenAI } from "openai";
import "dotenv/config";

const DEFAULT_ENDPOINT = "https://models.inference.ai.azure.com";
const DEFAULT_API_VERSION = "2024-02-15-preview";
const DEFAULT_MODEL = "gpt-4o";

function buildClientOptions(modelName: string) {
  const token = process.env.GITHUB_MODELS_TOKEN;
  const baseURL = process.env.GITHUB_MODELS_ENDPOINT ?? DEFAULT_ENDPOINT;
  const apiVersion = process.env.GITHUB_MODELS_API_VERSION ?? DEFAULT_API_VERSION;

  if (!token) {
    throw new Error("GITHUB_MODELS_TOKEN is not set in environment variables.");
  }

  return {
    baseURL,
    apiKey: token,
    defaultHeaders: {
      "x-ms-model-id": modelName,
    },
    defaultQuery: {
      "api-version": apiVersion,
    },
  } as const;
}

export function createGitHubModelsClient(modelName: string = DEFAULT_MODEL) {
  const options = buildClientOptions(modelName);

  return new OpenAI(options);
}

export function createGitHubModelsChatOpenAI(
  modelName: string = DEFAULT_MODEL,
  options: {
    temperature?: number;
    maxTokens?: number;
    streaming?: boolean;
  } = {}
) {
  const clientOptions = buildClientOptions(modelName);

  return new ChatOpenAI({
    model: modelName,
    temperature: options.temperature ?? 0.3,
    maxTokens: options.maxTokens ?? 1000,
    streaming: options.streaming ?? false,
    configuration: clientOptions,
  });
}

export async function validateGitHubToken(): Promise<boolean> {
  try {
    const client = createGitHubModelsClient();

    await client.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [{ role: "user", content: "test" }],
      max_tokens: 5,
    });

    return true;
  } catch (error: any) {
    const status = error?.response?.status;
    const info = error?.response?.data;

    console.error("Error validating GitHub token:", error.message ?? error);
    if (status) {
      console.error("Status:", status);
    }
    if (info) {
      console.error("Details:", JSON.stringify(info));
    }
    if (status === 404) {
      console.error(
        "404 recebido. Verifique se o acesso ao preview do GitHub Models está habilitado " +
          "e se o modelo solicitado está disponível para a sua conta."
      );
    }
    return false;
  }
}

export function showRateLimitInfo() {
  console.log("\n RATE LIMITS - GITHUB MODELS (FREE TIER)");
  console.log("━".repeat(60));
  console.log("Requests por minuto: Varia por modelo");
  console.log("Requests por dia: Limitado");
  console.log("Tokens por request: Varia por modelo");
  console.log("Uso: Gratuito para experimentação/protótipo");
  console.log("━".repeat(60));
  console.log("\n Para produção, migre para Azure OpenAI ou OpenAI direta");
  console.log("   (mesma API, só muda baseURL e apiKey)\n");
}
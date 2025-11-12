import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { createGitHubModelsClient, validateGitHubToken, showRateLimitInfo } from "./github-models";

async function askQuestion(): Promise<string> {
  const cliQuestion = process.argv.slice(2).join(" ").trim();
  if (cliQuestion) {
    return cliQuestion;
  }

  const rl = createInterface({ input, output });
  const answer = await rl.question("Pergunta para o modelo: ");
  rl.close();

  return answer.trim() || "Diga apenas: funcionando!";
}

async function main() {
  console.log("Teste rápido com GitHub Models (gpt-4o)\n");

  const question = await askQuestion();
  console.log(`Pergunta: ${question}\n`);

  const isValid = await validateGitHubToken();
  if (!isValid) {
    console.error("Token inválido ou problema de conexão");
    return;
  }

  const client = createGitHubModelsClient("gpt-4o");
  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: question }],
    max_tokens: 100,
  });

  console.log("Resposta:");
  console.log(response.choices[0].message.content);

  showRateLimitInfo();
}

main().catch((error: any) => {
  console.error("Erro:", error.message ?? error);
  if (error?.response?.status) {
    console.error("Status:", error.response.status);
  }
  if (error?.response?.data) {
    console.error("Detalhes:", JSON.stringify(error.response.data));
  }
  console.error("Consulte as instruções de acesso ao GitHub Models Preview.");
  process.exitCode = 1;
});
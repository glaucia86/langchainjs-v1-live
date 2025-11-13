import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env') });

import { createAgent } from 'langchain';
import { HumanMessage } from '@langchain/core/messages';
import { createGitHubModelsChatOpenAI } from '../github-models';

async function main() {
  console.log(' Módulo 1: Hello Agent com LangChain.js v1');
  console.log('-'.repeat(60));

  const model = createGitHubModelsChatOpenAI('gpt-4o', {
    temperature: 0.3,
    maxTokens: 500,
  });

  const agent = createAgent({
    model: model,
    tools: [], // por enquanto, sem ferramentas
    systemPrompt: `Você é um assistente prestativo e educado que responde em português brasileiro. 
      Seja direto, claro e amigável nas suas respostas.`,
  });

  // Pergunta 1:
  const result1 = await agent.invoke({
    messages: [new HumanMessage('Qual é a capital do Japão?')],
  });

  console.log("Resposta...: ", result1.messages[result1.messages.length - 1].content);

  // Pergunta 2:
  const result2 = await agent.invoke({
    messages: [new HumanMessage('Me dê 3 curiosidades sobre Tóquio')],
  });

  console.log("Resposta...: ", result2.messages[result2.messages.length - 1].content);

  // Pergunta 3:
  const result3 = await agent.invoke({
    messages: [new HumanMessage('Meu nome é Glaucia')], // o agent não tem memória automatica, então precisamos passar o contexto
  });

  console.log("Resposta...: ", result3.messages[result3.messages.length - 1].content);

  // Pergunta 4: Testando se lembra do nome
  const result4 = await agent.invoke({
    messages: [
      new HumanMessage('Meu nome é Glaucia'),
      new HumanMessage('Qual é o meu nome?'),
    ],
  });

  console.log("Resposta...: ", result4.messages[result4.messages.length - 1].content);

  // Exibir metadados (new na v1)
  console.log('Informações:');
  console.log(`Total de mensagens...:  ${result4.messages.length}`);
  console.log(`Tipo da última mensagem...: ${result4.messages[result4.messages.length - 1].constructor.name}`);
  console.log(`Output formatado...: ${typeof result4.messages[result4.messages.length - 1].content}`);
}

main().catch(console.error);
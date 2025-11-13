import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env') });

import { createAgent } from 'langchain';  
import { tool } from '@langchain/core/tools';
import { HumanMessage } from '@langchain/core/messages';
import * as z from 'zod';
import { createGitHubModelsChatOpenAI } from '../github-models';

const calculator = tool(
  async ({ a, b, operation }: { a: number, b: number, operation: string }) => {
    console.log(`Parâmetros: a=${a}, b=${b}, operation=${operation}`);

    const operations: Record<string, number> = {
      add: a + b,
      subtract: a - b,
      multiply: a * b,
      divide: b !== 0 ? a / b : NaN,
    };

    const result = operations[operation];

    if (result === undefined || isNaN(result)) {
      return `Operação inválida ou divisão por zero.`;
    }

    console.log(`Resultado...: ${result}`);
    return `O resultado de ${operation} entre ${a} e ${b} é ${result}.`;
  },
  {
    name: 'calculator',
    description: 'Realiza operações matemáticas básicas: adição, subtração, multiplicação e divisão.',
    schema: z.object({
      a: z.number().describe('O primeiro número.'),
      b: z.number().describe('O segundo número.'),
      operation: z.enum(['add', 'subtract', 'multiply', 'divide']).describe('A operação a ser realizada: add, subtract, multiply, divide.'),
    }),
  }
);

async function main() {
  console.log(' Módulo 2: Calculator Agent com Tools em LangChain.js v1');
  console.log('-'.repeat(60));

  const model = createGitHubModelsChatOpenAI('gpt-4o', {
    temperature: 0.3,
    maxTokens: 500,
  });

  const agent = createAgent({
    model: model,
    tools: [calculator],
    systemPrompt: `Você é um assistente matemático prestativo. Quando o usuário pedir cálculos, use a ferramenta 'calculator'
      disponível. Sempre explique o resultado de forma clara e amigável.`
  });

  // Exemplo 1: Adição
  console.log('\n-- Exemplo 1: Adição --');
  const result1 = await agent.invoke({
    messages: [new HumanMessage('Qual é a soma de 15 e 27?')],
  });
  console.log("Resposta...: ", result1.messages[result1.messages.length - 1].content);

  // Exemplo 2: Multiplicação
  console.log('\n-- Exemplo 2: Multiplicação --');
  const result2 = await agent.invoke({
    messages: [new HumanMessage('Quanto é 8 multiplicado por 12?')],
  });
  console.log("Resposta...: ", result2.messages[result2.messages.length - 1].content);

  // Exemplo 3: Divisão
  console.log('\n-- Exemplo 3: Divisão --');
  const result3 = await agent.invoke({
    messages: [new HumanMessage('Divida 100 por 4, por favor.')],
  });
  console.log("Resposta...: ", result3.messages[result3.messages.length - 1].content);

  // Exemplo 4: Subtração
  console.log('\n-- Exemplo 4: Subtração --');
  const result4 = await agent.invoke({
    messages: [new HumanMessage('Qual é a diferença entre 50 e 19?')],
  });
  console.log("Resposta...: ", result4.messages[result4.messages.length - 1].content);

  // Exemplo 5: Múltiplas operações (raciocínio)
  console.log('\n-- Exemplo 5: Múltiplas operações --');
  const result5 = await agent.invoke({
    messages: [new HumanMessage('Calcule (15 + 5) e depois multiplique por 3')],
  });
  console.log("Resposta...: ", result5.messages[result5.messages.length - 1].content);

  // Análise do comportamento do agent com ferramentas
  console.log('\n Análise:');
  console.log(`Total de mensagens no último teste....: ${result5.messages.length}`);
  console.log('\n Histórico de mensagens:');
  result5.messages.forEach((msg, index) => {
    console.log(`  ${index + 1}. ${msg.constructor.name}: ${typeof msg.content === 'string' ? msg.content.substring(0, 50) : '[tool call]'}...`);
  });

}

main().catch(console.error);
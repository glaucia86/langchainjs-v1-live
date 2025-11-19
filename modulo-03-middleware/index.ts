import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env') });

import { createAgent, createMiddleware } from 'langchain';
import { tool } from '@langchain/core/tools';
import { HumanMessage } from '@langchain/core/messages';
import * as z from 'zod';
import { createGitHubModelsChatOpenAI } from '../github-models';

/**
 * 🔧 TOOL: Calculator
 * Realiza operações matemáticas simples
 */
const calculator = tool(
  async ({ a, b, operation }: { a: number; b: number; operation: string }) => {
    const operations: Record<string, number> = {
      add: a + b,
      subtract: a - b,
      multiply: a * b,
      divide: b !== 0 ? a / b : NaN,
    };
    return `Resultado: ${a} ${operation} ${b} = ${operations[operation]}`;
  },
  {
    name: 'calculator',
    description: 'Realiza operações matemáticas: add, subtract, multiply, divide',
    schema: z.object({
      a: z.number().describe('Primeiro número'),
      b: z.number().describe('Segundo número'),
      operation: z.enum(['add', 'subtract', 'multiply', 'divide']).describe('Operação'),
    }),
  }
);

/**
 * 📊 MIDDLEWARE: Simple Logger
 * 
 * Demonstra os 3 hooks principais do middleware:
 * 1. beforeModel - Roda ANTES de cada chamada ao LLM
 * 2. afterModel - Roda DEPOIS de cada chamada ao LLM  
 * 3. wrapToolCall - Intercepta CADA chamada de ferramenta
 */
const simpleLogger = createMiddleware({
  name: 'simple-logger', // ✅ obrigatório no v1

  // 🟦 Hook 1: Antes do modelo ser chamado
  beforeModel: (state) => {
    console.log('\n[BEFORE MODEL]');
    console.log(`Mensagens no contexto: ${state.messages.length}`);

    const lastMessage = state.messages.at(-1);
    if (lastMessage) {
      console.log(`Última mensagem: "${lastMessage.content}"`);
    }
  },

  // 🟪 Hook 2: Depois do modelo responder
  afterModel: (state) => {
    console.log('\n[AFTER MODEL]');
    console.log(`Resposta recebida do LLM`);

    // Verifica se o modelo chamou alguma ferramenta
    const lastMessage = state.messages.at(-1) as any;
    const toolCalls =
      lastMessage?.additional_kwargs?.tool_calls ?? lastMessage?.tool_calls ?? [];
    const hasToolCalls = Array.isArray(toolCalls) && toolCalls.length > 0;

    console.log(`Chamou ferramentas? ${hasToolCalls ? 'Sim' : 'Não'}`);
  },

  // 🔧 Hook 3: Quando uma ferramenta é executada
  wrapToolCall: async (request, handler) => {
    console.log('\n[TOOL CALL]');
    console.log(`Ferramenta: ${request.tool.name}`);
    console.log(`Argumentos:`, request.toolCall.args);

    // Executa a ferramenta (passando request)
    const result = await handler(request); // ✅ passar request

    // Extrai apenas o conteúdo do ToolMessage
    const content = typeof result === 'object' && 'content' in result
      ? result.content
      : String(result);
    console.log(`Resultado: ${content}`);

    return result;
  },
});

async function main() {
  console.log('Módulo 3: Middleware Simples');
  console.log('Demonstração dos 3 hooks principais\n');
  console.log('='.repeat(60));

  const model = createGitHubModelsChatOpenAI('gpt-4o', {
    temperature: 0.3,
    maxTokens: 800,
  });

  const agent = createAgent({
    model: model,
    tools: [calculator],
    middleware: [simpleLogger], // Middleware aplicado
    systemPrompt: `Você é um assistente matemático prestativo.
    Use a ferramenta 'calculator' quando precisar fazer cálculos.
    Sempre explique o resultado de forma clara.`,
  });

  // 📝 Teste 1: Cálculo simples (vai usar a tool)
  console.log('\n\nTESTE 1: Soma');
  console.log('Pergunta: "Quanto é 15 + 27?"\n');
  
  const result1 = await agent.invoke({
    messages: [new HumanMessage('Quanto é 15 + 27?')],
  });
  
  console.log('\nResposta final:', result1.messages[result1.messages.length - 1].content);

  // 📝 Teste 2: Pergunta simples (não vai usar tool)
  console.log('\n\n' + '='.repeat(60));
  console.log('\nTESTE 2: Pergunta sem cálculo');
  console.log('Pergunta: "Olá, tudo bem?"\n');
  
  const result2 = await agent.invoke({
    messages: [new HumanMessage('Olá, tudo bem?')],
  });
  
  console.log('\nResposta final:', result2.messages[result2.messages.length - 1].content);

  // 📝 Teste 3: Múltiplas operações
  console.log('\n\n' + '='.repeat(60));
  console.log('\nTESTE 3: Múltiplas operações');
  console.log('Pergunta: "Calcule 10 * 5 e depois divida por 2"\n');
  
  const result3 = await agent.invoke({
    messages: [new HumanMessage('Calcule 10 * 5 e depois divida por 2')],
  });
  
  console.log('\nResposta final:', result3.messages[result3.messages.length - 1].content);
}

main().catch(console.error);
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env') });

import { createAgent } from 'langchain';
import { tool } from '@langchain/core/tools';
import { HumanMessage } from '@langchain/core/messages';
import * as z from 'zod';
import { createGitHubModelsChatOpenAI } from '../github-models';

/**
 * MOCK DATABASE: Dados de clima
 */
const weatherData: Record<string, { temp: number; condition: string }> = {
  'são paulo': { temp: 27, condition: 'Ensolarado' },
  'curitiba': { temp: 19, condition: 'Chuvoso' },
  'rio de janeiro': { temp: 32, condition: 'Parcialmente nublado' },
  'porto alegre': { temp: 22, condition: 'Ventoso' },
};

// Tool 1 - Get Weather: Busca informações do Clima de uma cidade
const getWeather = tool(
  async ({ city }: { city: string }) => {
    console.log(`\n Tool: getWeather | Cidade: ${city}`);

    const cityLower = city.toLowerCase();
    const info = weatherData[cityLower];

    if (!info) {
      return `Desculpe, não tenho dados de clima para a cidade de ${city}.`;
    }

    const result = `${city}: ${info.temp}°C, ${info.condition}`;
    console.log(`Resultado...: ${result}`);
    return result;
  },
  {
    name: 'getWeather',
    description: 'Obtém informações do clima para uma cidade específica.',
    schema: z.object({
      city: z.string().describe('O nome da cidade para a qual deseja obter o clima.'),
    }),
  }
);

// Tool 2 - Suggest Clothing: Sugere roupas com base no clima
const suggestClothing = tool(
  async ({ temperature }: { temperature: number }) => {
    console.log(`\n Tool: suggestClothing | Temperatura: ${temperature}°C`);

    let suggestion: string;

    if (temperature < 15) {
      suggestion = 'Use casaco pesado e agasalhos 🧥';
    } else if (temperature < 20) {
      suggestion = 'Use casaco leve ou blusa 🧥';
    } else if (temperature < 25) {
      suggestion = 'Vista algo confortável, clima agradável 👕';
    } else {
      suggestion = 'Vista roupas leves e frescas 👕☀️';
    } 

    console.log(`Sugestão...: ${suggestion}`);
    return suggestion;
  }, 
  {
    name: 'suggestClothing',
    description: 'Sugere roupas apropriadas com base na temperatura fornecida.',
    schema: z.object({
      temperature: z.number().describe('A temperatura em graus Celsius.'),
    }),
  }
);

// Tool 3 - Suggest Activity: Sugere atividades com base no clima
const suggestActivity = tool(
  async ({ condition }: { condition: string }) => {
    console.log(`\n Tool: suggestActivity | Condição: ${condition}`);

    let suggestion: string;

    const condLower = condition.toLowerCase();

    if (condLower.includes('sol') || condLower.includes('ensolarado')) {
      suggestion = 'Ótimo dia para um passeio ao ar livre! ☀️🚶';
    } else if (condLower.includes('chuv')) {
      suggestion = 'Melhor ficar em casa, que tal um filme? 🎬🍿';
    } else if (condLower.includes('nublado')) {
      suggestion = 'Bom dia para atividades indoor ou caminhada leve 🚶';
    } else if (condLower.includes('vento')) {
      suggestion = 'Cuidado com o vento! Prenda o cabelo e evite guarda-chuva 💨';
    } else {
      suggestion = 'Aproveite o dia da melhor forma! 😊';
    }

    console.log(`Sugestão...: ${suggestion}`);
    return suggestion;
  },
  {
    name: 'suggestActivity',
    description: 'Sugere atividades com base na condição climática fornecida.',
    schema: z.object({
      condition: z.string().describe('A condição climática, como ensolarado, chuvoso, nublado, etc.'),
    }),
  }
);

async function main() {
  console.log(' Módulo 2: Weather Agent com Tools em LangChain.js v1');
  console.log('-'.repeat(60));

  const model = createGitHubModelsChatOpenAI('gpt-4o', {
    temperature: 0.3,
    maxTokens: 1000,
  });

  const weatherAgent = createAgent({
    model: model,
    tools: [getWeather, suggestClothing, suggestActivity],
    systemPrompt: `Você é um assistente de clima amigável e prestativo.
    
    Você tem acesso a 3 ferramentas:
    1. get_weather: para buscar o clima de uma cidade
    2. suggest_clothing: para sugerir roupas baseado na temperatura
    3. suggest_activity: para sugerir atividades baseado na condição climática
    
    Quando o usuário perguntar sobre clima, use TODAS as ferramentas relevantes
    para dar uma resposta completa e útil. Combine as informações de forma natural.`
  });

  // Teste 1: Pergunta simples sobre o clima:
  console.log('\n Teste 1: Clima de uma cidade');
  const result1 = await weatherAgent.invoke({
    messages: [new HumanMessage('Qual é o clima em São Paulo hoje?')],
  });
  console.log('\n Resposta...: ', result1.messages[result1.messages.length - 1].content);

  // Teste 2: Pergunta completa (clima + roupa)
  console.log('\n Teste 2: Clima e sugestão de roupa');
  const result2 = await weatherAgent.invoke({
    messages: [new HumanMessage('Que roupa devo usar em Curitiba hoje?')],
  });
  console.log('\n Resposta...: ', result2.messages[result2.messages.length - 1].content);

  // Teste 3: Pergunta completa (clima + atividade + roupa)
  console.log('\n Teste 3: Clima, sugestão de atividade e roupa');
  const result3 = await weatherAgent.invoke({
    messages: [new HumanMessage('O que posso fazer hoje no Rio de Janeiro e que roupa devo usar?')],
  });
  console.log('\n Resposta...: ', result3.messages[result3.messages.length - 1].content);

  // Análise do Fluxo:
  console.log('\n\n Análise do fluxo (Teste 3):');
  console.log(`Total de mensagens: ${result3.messages.length}`);

  console.log('\n Fluxo de execução:');
  result3.messages.forEach((msg, idx) => {
    const type = msg.constructor.name;
    if (type === 'HumanMessage') {
      console.log(`  ${idx + 1}. Usuário: ${(msg.content as string).substring(0, 50)}...`);
    } else if (type === 'AIMessage') {
      const hasToolCalls = (msg as any).tool_calls?.length > 0;
      if (hasToolCalls) {
        const toolNames = (msg as any).tool_calls.map((tc: any) => tc.name).join(', ');
        console.log(`  ${idx + 1}. AI decidiu chamar: ${toolNames}`);
      } else {
        console.log(`  ${idx + 1}. AI resposta final`);
      }
    } else if (type === 'ToolMessage') {
      console.log(`  ${idx + 1}. Tool resultado`);
    }
  });
}

main().catch(console.error);

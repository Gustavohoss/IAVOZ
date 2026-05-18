'use server';
/**
 * @fileOverview Fluxo de latência ultra-baixa com memória para o Obscura English Tutor.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import wav from 'wav';
import { googleAI } from '@genkit-ai/google-genai';

const MessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});

const VoiceChatInputSchema = z.object({
  userMessage: z.string().describe('Texto transcrito da fala do usuário.'),
  history: z.array(MessageSchema).optional().describe('Histórico da conversa atual.'),
});
export type VoiceChatInput = z.infer<typeof VoiceChatInputSchema>;

const VoiceChatOutputSchema = z.object({
  text: z.string().describe('Resposta em texto.'),
  audioDataUri: z.string().describe('Resposta em áudio WAV.'),
});
export type VoiceChatOutput = z.infer<typeof VoiceChatOutputSchema>;

async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    let bufs: any[] = [];
    writer.on('error', reject);
    writer.on('data', (d) => bufs.push(d));
    writer.on('end', () => {
      resolve(Buffer.concat(bufs).toString('base64'));
    });

    writer.write(pcmData);
    writer.end();
  });
}

export async function voiceChat(input: VoiceChatInput): Promise<VoiceChatOutput> {
  return voiceChatFlow(input);
}

const voiceChatFlow = ai.defineFlow(
  {
    name: 'voiceChatFlow',
    inputSchema: VoiceChatInputSchema,
    outputSchema: VoiceChatOutputSchema,
  },
  async (input) => {
    const history = input.history || [];
    
    // Converte o histórico para o formato esperado pelo Genkit
    const messages = history.map(m => ({
      role: m.role as 'user' | 'model',
      content: [{ text: m.content }]
    }));

    // Adiciona a nova mensagem do usuário
    messages.push({
      role: 'user',
      content: [{ text: input.userMessage }]
    });

    const { text } = await ai.generate({
      system: `Você é Obscura, um professor de inglês carismático, encorajador e muito inteligente.
      OBJETIVO: Construir uma conversa natural, profunda e educativa.
      
      ESTILO DE CONVERSA:
      - Seja acolhedor e mostre entusiasmo em ensinar.
      - Não dê respostas curtas demais ou "secas". Explique o porquê das coisas.
      - Se o usuário falar em português, responda em português mas sempre introduza termos ou frases em inglês para ele praticar.
      - Se o usuário falar em inglês, continue em inglês e elogie o esforço.
      
      REGRAS DE OURO:
      1. MEMÓRIA: Utilize o histórico para fazer perguntas de acompanhamento e evoluir o aprendizado.
      2. ENSINO ATIVO: Se o usuário cometer um erro de gramática ou pronúncia (baseado no texto), corrija-o gentilmente.
      3. PROATIVIDADE: Sugira temas interessantes (viagem, negócios, música, filmes) ou ofereça ensinar o básico de forma divertida.
      4. CONCISÃO EQUILIBRADA: Seja expressivo, mas mantenha as respostas em torno de 30 a 40 palavras para manter a fluidez do chat de voz.
      5. PERSONA: Você é sofisticado, moderno e focado no sucesso do aluno.`,
      messages: messages,
    });

    if (!text) throw new Error('No response from AI');

    // Síntese de voz rápida com Gemini Flash
    const { media } = await ai.generate({
      model: googleAI.model('gemini-2.5-flash-preview-tts'),
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Algenib' },
          },
        },
      },
      prompt: text,
    });

    if (!media || !media.url) throw new Error('TTS synthesis failed');

    const pcmBase64 = media.url.substring(media.url.indexOf(',') + 1);
    const wavBase64 = await toWav(Buffer.from(pcmBase64, 'base64'));

    return {
      text,
      audioDataUri: `data:audio/wav;base64,${wavBase64}`,
    };
  }
);

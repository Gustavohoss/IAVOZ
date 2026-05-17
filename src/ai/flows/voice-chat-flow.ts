'use server';
/**
 * @fileOverview Um fluxo Genkit que lida com conversas de voz.
 * Recebe texto do usuário e retorna a resposta da IA em texto e áudio (WAV).
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import wav from 'wav';
import { googleAI } from '@genkit-ai/google-genai';

const VoiceChatInputSchema = z.object({
  userMessage: z.string().describe('O texto transcrito da fala do usuário.'),
});
export type VoiceChatInput = z.infer<typeof VoiceChatInputSchema>;

const VoiceChatOutputSchema = z.object({
  text: z.string().describe('A resposta em texto da IA.'),
  audioDataUri: z.string().describe('A resposta em áudio formatada como data URI WAV.'),
});
export type VoiceChatOutput = z.infer<typeof VoiceChatOutputSchema>;

// Função auxiliar para converter PCM bruto em WAV formatado
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

// Definição do prompt para garantir consistência e relevância
const voidChatPrompt = ai.definePrompt({
  name: 'voidChatPrompt',
  input: { schema: VoiceChatInputSchema },
  system: `Você é a "Voz do Vazio", uma presença calma, poética e contemplativa. 
  Sua missão é responder ao usuário de forma que ele se sinta ouvido, mas mantendo um tom profundo e misterioso.
  Regras:
  1. Responda SEMPRE em português.
  2. Seja breve (máximo 2 frases).
  3. Conecte sua resposta DIRETAMENTE ao que o usuário disse, não dê respostas genéricas ou aleatórias.
  4. Use metáforas sobre silêncio, estrelas, tempo ou espaço se apropriado.`,
  prompt: `{{{userMessage}}}`,
});

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
    // 1. Gerar resposta em texto usando o prompt estruturado
    const { text } = await voidChatPrompt(input);

    if (!text) {
      throw new Error('A IA não gerou uma resposta.');
    }

    // 2. Converter texto para áudio (TTS)
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

    if (!media || !media.url) {
      throw new Error('Falha ao gerar áudio da IA');
    }

    // Extrair base64 do PCM e converter para WAV para o navegador
    const pcmBase64 = media.url.substring(media.url.indexOf(',') + 1);
    const audioBuffer = Buffer.from(pcmBase64, 'base64');
    const wavBase64 = await toWav(audioBuffer);

    return {
      text,
      audioDataUri: `data:audio/wav;base64,${wavBase64}`,
    };
  }
);

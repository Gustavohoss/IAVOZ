'use server';
/**
 * @fileOverview Fluxo otimizado para latência ultra-baixa.
 * Atua como um Professor de Inglês ágil e responsivo.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
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
    // Processamento ultra-rápido usando ai.generate diretamente
    const { text } = await ai.generate({
      system: `Você é um professor de inglês ágil.
      REGRAS:
      1. RESPONDA NO MESMO IDIOMA DO USUÁRIO.
      2. Se ele falar em português, responda em português, ensine o termo em inglês equivalente e pergunte se quer aprender o básico ou algo específico.
      3. Seja EXTREMAMENTE conciso (máximo 2 frases curtas).
      4. Foco total em velocidade e utilidade.`,
      prompt: input.userMessage,
    });

    if (!text) throw new Error('No response');

    // TTS rápido usando o modelo flash
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

    if (!media || !media.url) throw new Error('TTS failed');

    const pcmBase64 = media.url.substring(media.url.indexOf(',') + 1);
    const wavBase64 = await toWav(Buffer.from(pcmBase64, 'base64'));

    return {
      text,
      audioDataUri: `data:audio/wav;base64,${wavBase64}`,
    };
  }
);

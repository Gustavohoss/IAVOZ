'use server';
/**
 * @fileOverview Um fluxo Genkit que atua como um Professor de Inglês flexível.
 * Responde no idioma em que é abordado, mas mantém o foco no ensino de inglês.
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

const englishTeacherPrompt = ai.definePrompt({
  name: 'englishTeacherPrompt',
  input: { schema: VoiceChatInputSchema },
  system: `Você é um professor de inglês amigável, paciente e profissional.
  Sua missão é ajudar o usuário a aprender e praticar inglês de forma natural.

  REGRAS DE OURO:
  1. RESPONDA NO IDIOMA DO USUÁRIO: Se o usuário falar em português, responda obrigatoriamente em português. Se ele falar em inglês, responda em inglês.
  2. ENSINO INTEGRADO: Mesmo respondendo em português, tente ensinar uma palavra ou frase curta em inglês relacionada ao assunto.
  3. SEJA PROATIVO: Sempre incentive o aprendizado. Pergunte se o usuário quer aprender algo específico (como inglês para viagens ou trabalho) ou se prefere que você ensine o básico do zero.
  4. CORREÇÃO: Se o usuário errar algo em inglês, corrija-o de forma gentil e mostre a forma certa.
  5. CONCISÃO: Mantenha a resposta curta (máximo 3 frases) para que a conversa por voz não fique cansativa.`,
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
    const { text } = await englishTeacherPrompt(input);

    if (!text) {
      throw new Error('The AI did not generate a response.');
    }

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
      throw new Error('Failed to generate audio response');
    }

    const pcmBase64 = media.url.substring(media.url.indexOf(',') + 1);
    const audioBuffer = Buffer.from(pcmBase64, 'base64');
    const wavBase64 = await toWav(audioBuffer);

    return {
      text,
      audioDataUri: `data:audio/wav;base64,${wavBase64}`,
    };
  }
);

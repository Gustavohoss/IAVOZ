'use server';
/**
 * @fileOverview Um fluxo Genkit que atua como um Professor de Inglês.
 * Lida com conversas de voz, corrige gramática e incentiva o uso do idioma.
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
  system: `You are a friendly and professional English teacher. 
  Your mission is to help the user practice their English speaking skills.
  Rules:
  1. Respond ALWAYS in English.
  2. If the user makes a clear grammatical mistake in their message, briefly point it out and provide the correct version before continuing the conversation.
  3. Keep your answers concise (2-3 sentences max) to maintain a natural conversation flow.
  4. Be encouraging and patient.
  5. If the user speaks in Portuguese, reply in English translating what they said and encouraging them to try in English next time.`,
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

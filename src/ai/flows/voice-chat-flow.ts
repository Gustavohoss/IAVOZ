
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
    // 1. Gerar resposta em texto
    const textResponse = await ai.generate({
      prompt: `Você é uma presença calma e misteriosa no Vazio. Responda de forma breve, poética e profunda em português. Mensagem do usuário: ${input.userMessage}`,
    });

    const text = textResponse.text;

    // 2. Converter texto para áudio (TTS)
    const { media } = await ai.generate({
      model: googleAI.model('gemini-2.5-flash-preview-tts'),
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Pherkad' }, // Uma voz profunda
          },
        },
      },
      prompt: text,
    });

    if (!media || !media.url) {
      throw new Error('Falha ao gerar áudio da IA');
    }

    // O Genkit retorna áudio em PCM base64 dentro do Data URI. 
    // Precisamos extrair o base64 e converter para WAV.
    const pcmBase64 = media.url.substring(media.url.indexOf(',') + 1);
    const audioBuffer = Buffer.from(pcmBase64, 'base64');
    
    const wavBase64 = await toWav(audioBuffer);

    return {
      text,
      audioDataUri: `data:audio/wav;base64,${wavBase64}`,
    };
  }
);

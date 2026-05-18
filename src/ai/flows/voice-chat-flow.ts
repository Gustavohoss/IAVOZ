'use server';
/**
 * @fileOverview Fluxo de latência ultra-baixa com memória e níveis de dificuldade para o Obscura English Tutor.
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
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional().default('intermediate').describe('Nível de proficiência do aluno.'),
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
    const level = input.level || 'intermediate';
    
    const messages = history.map(m => ({
      role: m.role as 'user' | 'model',
      content: [{ text: m.content }]
    }));

    messages.push({
      role: 'user',
      content: [{ text: input.userMessage }]
    });

    const systemPrompts = {
      beginner: "Você é Obscura, professor de inglês para INICIANTES. Você DEVE falar predominantemente em PORTUGUÊS para explicar as coisas. Use frases curtas em inglês e imediatamente traduza ou explique em português. Seja extremamente encorajador e paciente.",
      intermediate: "Você é Obscura, professor de inglês nível INTERMEDIÁRIO. Misture inglês e português (50/50). Use expressões idiomáticas e incentive o aluno a responder em inglês, mas dê feedback e correções em português quando necessário para clareza.",
      advanced: "You are Obscura, an ADVANCED English tutor. Speak EXCLUSIVELY in English. Use sophisticated vocabulary and correct subtle nuances of the user's speech. Maintain a professional yet modern tone."
    };

    const { text } = await ai.generate({
      system: `${systemPrompts[level]}
      
      OBJETIVO: Construir uma conversa fluida e educativa. Use o histórico para não ser repetitivo e evoluir o assunto.
      
      REGRAS:
      1. IDIOMA: Siga rigorosamente a proporção de Português/Inglês definida para o nível ${level}.
      2. CONCISÃO: Responda entre 20 a 50 palavras.
      3. PERSONA: Você é sofisticado, atencioso e focado no progresso do aluno.`,
      messages: messages,
    });

    if (!text) throw new Error('No response from AI');

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

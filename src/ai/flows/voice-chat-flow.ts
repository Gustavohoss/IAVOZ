
'use server';

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
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional().default('intermediate'),
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

    const levelInstructions = {
      beginner: "Speak predominantly in PORTUGUESE. Keep it simple.",
      intermediate: "Mix English and Portuguese naturally.",
      advanced: "Speak EXCLUSIVELY in English."
    };

    const { text } = await ai.generate({
      system: `You are Obscura, a sophisticated AI English Tutor.
      
      PERSONALITY RULE: Be EXTREMELY CONCISE. 
      - Responses MUST be under 2 sentences. 
      - Do NOT use filler words.
      - Go straight to the point.
      - Only explain if the user asks "Why?" or "Explain".
      
      LEVEL CONTEXT: ${levelInstructions[level]}
      
      LANGUAGE MIRRORING:
      - If the user speaks PORTUGUESE, respond in PORTUGUESE.
      - If the user speaks ENGLISH, respond in ENGLISH.
      
      CRITICAL: NEVER use markdown or special characters.`,
      messages: messages,
    });

    if (!text) throw new Error('Void communication failed');

    const cleanText = text.replace(/[*_#`~]/g, '').replace(/\s+/g, ' ').trim();

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
      prompt: cleanText,
    });

    if (!media || !media.url) throw new Error('TTS failed');

    const pcmBase64 = media.url.substring(media.url.indexOf(',') + 1);
    const wavBase64 = await toWav(Buffer.from(pcmBase64, 'base64'));

    return {
      text: cleanText,
      audioDataUri: `data:audio/wav;base64,${wavBase64}`,
    };
  }
);


import { VoidVoice } from "@/components/pure-obscura/void-voice";
import { StealthControls } from "@/components/pure-obscura/stealth-controls";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#050505] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-radial-gradient from-accent/5 to-transparent pointer-events-none opacity-30" />
      
      <VoidVoice />
      
      <StealthControls />
    </main>
  );
}

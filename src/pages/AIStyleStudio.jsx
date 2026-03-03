import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles, X, Camera, Send, Loader2,
  Image as ImageIcon, Instagram, WifiOff
} from 'lucide-react';

// --- CONFIG & AI LOGIC ---
const SITE_KNOWLEDGE = `Hairly is a premium hairstylist portfolio with real-time style analysis.`;

async function queryGemini(prompt) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey || !window.navigator.onLine) return "Connection error.";

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      }
    );
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";
  } catch (error) { return "Error."; }
}

export default function AIStyleStudio() {
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(window.navigator.onLine);
  const [chatHistory, setChatHistory] = useState([
    { role: 'ai', text: "Kilo Vision active. How can I help with your style today?" }
  ]);

  const chatEndRef = useRef(null);

  // Diagnostic Log to identify why it's white
  useEffect(() => {
    console.log("AI Status:", isChatOpen ? "OPEN" : "CLOSED");
    if (isChatOpen) {
       document.body.style.overflow = 'hidden'; // Prevent background scrolling
    } else {
       document.body.style.overflow = 'unset';
    }
  }, [isChatOpen]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isTyping]);

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;

    const msg = chatInput;
    setChatHistory(prev => [...prev, { role: 'user', text: msg }]);
    setChatInput("");
    setIsTyping(true);

    const response = await queryGemini(msg + " " + SITE_KNOWLEDGE);
    setChatHistory(prev => [...prev, { role: 'ai', text: response }]);
    setIsTyping(false);
  };

  return (
    // Forced background color to your theme variable to prevent the "White Screen"
    <div className="relative w-full h-screen bg-[#050505] overflow-hidden">
      
      {/* 1. PORTFOLIO FEED (The Background) */}
      <section className="w-full h-full flex flex-col">
        <div className="p-6 border-b border-[#121212] flex justify-between items-center bg-[#050505]">
          <h1 className="text-2xl font-black italic uppercase text-[#8B5CF6]">Hairly</h1>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-10 no-scrollbar">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-[#121212] rounded-3xl overflow-hidden border border-white/5">
                <img src={`https://picsum.photos/600/800?random=${i + 10}`} className="w-full h-full object-cover grayscale opacity-50" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. THE MASTER OVERLAY (The AI Panel) */}
      <aside 
        className={`
          fixed inset-0 z-[99999] 
          bg-[#050505] flex flex-col transition-all duration-500 ease-in-out
          lg:relative lg:inset-auto lg:w-[480px] lg:border-l lg:border-[#121212]
          /* Visible/Hidden Logic */
          ${isChatOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none lg:translate-x-0 lg:opacity-100 lg:hidden'}
        `}
      >
        {/* Header */}
        <div className="p-6 border-b border-[#121212] flex items-center justify-between bg-[#050505]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#8B5CF6] rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.5)]">
              <Sparkles size={20} className="text-white" />
            </div>
            <span className="font-black text-xs tracking-widest uppercase text-white">Kilo Vision</span>
          </div>
          <button onClick={() => setIsChatOpen(false)} className="p-2 bg-[#121212] rounded-full text-white">
            <X size={24} />
          </button>
        </div>

        {/* Chat Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#050505] no-scrollbar">
          {chatHistory.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`p-4 max-w-[85%] rounded-[24px] text-sm font-bold leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-[#8B5CF6] text-white rounded-tr-none' 
                  : 'bg-[#121212] text-[#A1A1AA] rounded-tl-none border border-white/5'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {isTyping && (
             <div className="flex justify-start">
               <div className="bg-[#121212] p-4 rounded-2xl flex items-center gap-2">
                 <Loader2 className="animate-spin text-[#8B5CF6]" size={18} />
                 <span className="text-[10px] font-black text-[#A1A1AA] uppercase">Analyzing...</span>
               </div>
             </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-6 border-t border-[#121212] bg-[#050505] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2 p-1.5 rounded-full border-2 border-[#121212] bg-[#121212]/50 focus-within:border-[#8B5CF6] transition-all">
            <button type="button" className="p-3 text-[#8B5CF6]"><Camera size={24} /></button>
            <input 
              type="text" 
              value={chatInput} 
              onChange={(e) => setChatInput(e.target.value)} 
              placeholder="Message Kilo..." 
              className="flex-1 bg-transparent py-2 text-sm font-bold outline-none text-white placeholder:text-[#A1A1AA]" 
            />
            <button type="submit" className="p-3 bg-[#8B5CF6] text-white rounded-full"><Send size={18} /></button>
          </form>
        </div>
      </aside>

      {/* 3. TRIGGER BUTTON */}
      {!isChatOpen && (
        <button 
          onClick={() => setIsChatOpen(true)} 
          className="fixed bottom-32 right-6 w-16 h-16 bg-[#8B5CF6] text-white rounded-full flex items-center justify-center shadow-[0_0_25px_rgba(139,92,246,0.6)] z-[500] active:scale-95 transition-all"
        >
          <Sparkles size={28} />
        </button>
      )}

      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
}
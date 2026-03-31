import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles, X, Camera, Send, Loader2,
  Home, Search, User, Briefcase, Settings
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
// --- FIREBASE IMPORTS ---
import { db, auth } from '../../firebaseconfig'; 
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const SITE_KNOWLEDGE = `Hairly Studio Assistant (Kilo). Expert in: Style visualization, Face shape matching, and Stylist discovery. Tone: Premium, Expert, Trendy. Output: Concise expert advice.`;

async function queryGemini(prompt, base64Image = null) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const model = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash';

  if (!apiKey) return 'AI is not configured yet. Add VITE_GEMINI_API_KEY in .env and restart.';
  if (!window.navigator.onLine) return "You're offline right now. Reconnect to use Studio AI.";

  try {
    const payload = {
      contents: [{
        parts: [
          { text: prompt },
          ...(base64Image ? [{ inline_data: { mime_type: "image/jpeg", data: base64Image } }] : [])
        ]
      }]
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );
    const data = await response.json();
    if (!response.ok) return data?.error?.message || 'AI request failed. Please try again.';
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from AI. Please try again.';
  } catch {
    return "Kilo is currently adjusting its lens. Please try again shortly.";
  }
}

export default function AIStyleStudio() {
  const navigate = useNavigate();
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [selectedShape, setSelectedShape] = useState(null);
  const [tempImage, setTempImage] = useState(null);
  const [chatHistory, setChatHistory] = useState([
    { role: 'ai', text: "Welcome to Hairly Studio. Select your face shape or upload a photo to begin your transformation." }
  ]);

  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatHistory, isTyping]);

  // --- PERSISTENCE LOGIC ---
  const saveInteraction = async (text, role, img = null) => {
    if (!auth.currentUser) return;
    try {
      await addDoc(collection(db, "ai_sessions"), {
        userId: auth.currentUser.uid,
        text,
        role,
        imageIncluded: !!img,
        faceContext: selectedShape,
        timestamp: serverTimestamp()
      });
    } catch (e) { console.error("Firestore Error:", e); }
  };

  const handleSendMessage = async (textOverride) => {
    const msg = textOverride || chatInput;
    if (!msg.trim() && !tempImage) return;

    const currentImg = tempImage; // Capture current state before clearing
    setChatHistory(prev => [...prev, { role: 'user', text: msg, img: currentImg }]);
    setChatInput("");
    setTempImage(null);
    setIsTyping(true);

    // Save user message to Firebase
    await saveInteraction(msg, 'user', currentImg);

    const fullPrompt = currentImg 
      ? `Analyze this photo. ${msg}. ${SITE_KNOWLEDGE}` 
      : `${msg}. Context: ${SITE_KNOWLEDGE}`;

    const response = await queryGemini(fullPrompt, currentImg);
    
    setChatHistory(prev => [...prev, { role: 'ai', text: response }]);
    await saveInteraction(response, 'ai');
    setIsTyping(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = String(reader.result || '');
        setTempImage(dataUrl.split(',')[1] || null);
      };
      reader.readAsDataURL(file);
    }
  };

  const faceShapes = [
    { name: 'Oval', icon: '🥚' }, { name: 'Round', icon: '⭕' },
    { name: 'Square', icon: '⬜' }, { name: 'Heart', icon: '🤍' }
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col xl:flex-row bg-[#050505] text-white overflow-hidden font-sans pb-24 lg:pb-0">
      
      {/* 1. SIDE NAVIGATION (Reflecting image_3079db.png) */}
      <nav className="hidden xl:flex flex-col w-64 border-r border-white/5 bg-[#080808] p-6 justify-between">
        <div className="space-y-10">
          <div className="flex items-center gap-3 px-2 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-10 h-10 bg-[#8B5CF6] rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Sparkles size={20} className="text-white"/>
            </div>
            <h1 className="hidden lg:block text-2xl font-black italic tracking-tighter">Hairly</h1>
          </div>
          <div className="space-y-2">
            {[
              { icon: <Home size={22}/>, label: 'Home', path: '/home' },
              { icon: <Search size={22}/>, label: 'Explore', path: '/explore' },
              { icon: <Briefcase size={22}/>, label: 'Portfolio', path: '/portfolio' },
              { icon: <User size={22}/>, label: 'Profile', path: '/profile' },
            ].map((item) => (
              <button 
                key={item.label}
                onClick={() => navigate(item.path)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-[#121212] text-zinc-500 hover:text-[#8B5CF6] transition-all group"
              >
                {item.icon}
                <span className="hidden lg:block font-bold text-sm tracking-tight">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* 2. MAIN PREVIEW GRID */}
      <main className="order-2 xl:order-1 flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-12 no-scrollbar">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8 sm:mb-12">
            <h2 className="text-3xl sm:text-5xl font-black italic uppercase tracking-tighter">Studio<span className="text-[#8B5CF6]">.</span></h2>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] mt-4 flex items-center gap-2">
              <span className="w-8 h-[1px] bg-zinc-800"/> 
              {selectedShape ? `Exclusive ${selectedShape} Selection` : "Visualizer Engine"}
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-[#0A0A0A] rounded-3xl sm:rounded-[40px] border border-white/5 overflow-hidden group relative shadow-2xl">
                <img 
                  src={`https://picsum.photos/600/800?random=${i + (selectedShape ? 100 : 200)}`} 
                  alt={`Style ${i + 1}`}
                  className="w-full h-full object-cover opacity-40 grayscale group-hover:opacity-100 group-hover:grayscale-0 transition-all duration-700 scale-110 group-hover:scale-100" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent opacity-80" />
                <div className="absolute inset-0 p-3 sm:p-8 flex flex-col justify-end translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all">
                   <button 
                    onClick={() => handleSendMessage(`Analyze style #${i+1} for my current face shape context.`)}
                    className="w-full py-2.5 sm:py-4 bg-white text-black text-[10px] font-black uppercase rounded-xl sm:rounded-2xl hover:bg-[#8B5CF6] hover:text-white transition-colors"
                   >
                      Try On Style
                   </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* 3. KILO AI CHAT PANEL */}
      <aside className="order-1 xl:order-2 w-full xl:w-[460px] h-[56dvh] sm:h-[60dvh] xl:h-auto xl:min-h-[100dvh] border-b xl:border-b-0 xl:border-l border-white/5 bg-[#080808] flex flex-col relative">
        <div className="p-4 sm:p-8 border-b border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 bg-[#8B5CF6] rounded-2xl flex items-center justify-center">
                  <Sparkles size={28} className="text-white"/>
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-[#080808] rounded-full" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#8B5CF6]">Kilo Intelligence</p>
                <h3 className="text-xl font-bold text-white tracking-tight">Vision Flow</h3>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="p-2 rounded-lg text-zinc-600 hover:text-white hover:bg-white/5 transition-colors"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>

        {/* Shape Selection Pill Bar */}
        <div className="p-3 sm:p-4 border-b border-white/5 flex gap-2 overflow-x-auto no-scrollbar bg-[#0A0A0A]">
          {faceShapes.map((shape) => (
            <button 
              key={shape.name}
              onClick={() => {
                setSelectedShape(shape.name);
                handleSendMessage(`I have an ${shape.name} face shape. What do you suggest?`);
              }}
              className={`flex-shrink-0 flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl border transition-all ${
                selectedShape === shape.name ? 'bg-[#8B5CF6] border-[#8B5CF6]' : 'bg-[#121212] border-white/5 hover:border-[#8B5CF6]/40'
              }`}
            >
              <span className="text-[10px] font-black uppercase tracking-wider">{shape.name} {shape.icon}</span>
            </button>
          ))}
        </div>

        {/* Chat History Container */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-8 space-y-5 sm:space-y-8 no-scrollbar">
          {chatHistory.map((msg, i) => (
            <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`p-4 sm:p-6 max-w-[92%] rounded-2xl sm:rounded-[32px] text-xs sm:text-[13px] font-bold leading-relaxed ${
                msg.role === 'user' ? 'bg-[#8B5CF6] text-white rounded-tr-none shadow-xl' : 'bg-[#121212] text-zinc-300 rounded-tl-none border border-white/5'
              }`}>
                {msg.text}
              </div>
              {msg.img && <img src={`data:image/jpeg;base64,${msg.img}`} className="mt-3 w-28 h-28 sm:w-40 sm:h-40 object-cover rounded-2xl sm:rounded-3xl border-2 border-[#8B5CF6]/20 shadow-2xl" alt="Upload" />}
            </div>
          ))}
          {isTyping && (
             <div className="flex justify-start animate-in fade-in slide-in-from-left-4 duration-300">
               <div className="bg-[#121212] p-5 rounded-[24px] border border-white/5 flex items-center gap-3">
                 <Loader2 className="animate-spin text-[#8B5CF6]" size={16} />
                 <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Kilo Analyzing...</span>
               </div>
             </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Interactive Input Bar */}
        <div className="p-3 sm:p-8 border-t border-white/5 bg-[#080808] pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
          {tempImage && (
            <div className="mb-4 relative w-24 h-24 group">
              <img src={`data:image/jpeg;base64,${tempImage}`} className="w-full h-full object-cover rounded-2xl border border-[#8B5CF6]" alt="Preview" />
              <button onClick={() => setTempImage(null)} className="absolute -top-2 -right-2 p-1.5 bg-red-500 rounded-full text-white shadow-lg"><X size={12}/></button>
            </div>
          )}
          <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center gap-2 p-2 rounded-2xl sm:rounded-[28px] border-2 border-[#121212] bg-[#121212]/40 focus-within:border-[#8B5CF6] transition-all">
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
            <button type="button" onClick={() => fileInputRef.current.click()} className="p-3 sm:p-4 text-zinc-500 hover:text-[#8B5CF6] transition-colors"><Camera size={20} className="sm:w-6 sm:h-6" /></button>
            <input 
              type="text" 
              value={chatInput} 
              onChange={(e) => setChatInput(e.target.value)} 
              placeholder="Ask Kilo anything..." 
              className="flex-1 bg-transparent py-2 text-sm font-bold outline-none text-white placeholder:text-zinc-600" 
            />
            <button type="submit" className="p-3 sm:p-4 bg-[#8B5CF6] text-white rounded-xl sm:rounded-[22px] shadow-lg shadow-purple-500/30 hover:scale-105 active:scale-95 transition-all">
              <Send size={16} className="sm:w-[18px] sm:h-[18px]" />
            </button>
          </form>
        </div>
      </aside>

      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
}


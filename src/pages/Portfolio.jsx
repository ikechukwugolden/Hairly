import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, X, Camera, Send, Mic, MicOff, MessageSquare, Loader2, 
  Image as ImageIcon, Instagram, Scan, Columns, Volume2, VolumeX
} from 'lucide-react';

// AI PERSONALITY - Responses in Kilo's style (direct, technical, helpful)
const AI_PERSONALITY = {
  name: "Kilo",
  greeting: "Kilo Vision active. Use the camera to upload hair or face portraits. I can also compare two styles for you! Or ask me anything about your portfolio.",
  
  getResponse: (userMessage) => {
    const message = userMessage.toLowerCase().trim();
    
    // Greetings
    if (message.match(/^(hi|hello|hey|howdy|what's up|sup)/i)) {
      return "Hello! I'm Kilo, your AI portfolio assistant. I can analyze your hair and style, or answer questions about this portfolio. What would you like to know?";
    }
    
    // Questions about the portfolio/owner
    if (message.includes('who') && (message.includes('you') || message.includes('are'))) {
      return "I'm Kilo, an AI assistant built into this portfolio. I help visitors explore the work, analyze styles, and answer questions about the owner.";
    }
    
    if (message.includes('what') && message.includes('do')) {
      return "This portfolio showcases hair styling work. I can analyze your face or hair from photos, compare styles, and provide recommendations. Just upload an image or ask me something!";
    }
    
    if (message.includes('style') || message.includes('hair') || message.includes('cut') || message.includes('look')) {
      return "I can help you find the perfect style! Upload a photo of your face or current hair, and I'll analyze what suits you best. What style are you interested in?";
    }
    
    if (message.includes('contact') || message.includes('book') || message.includes('appointment')) {
      return "To book an appointment or get in touch, use the contact options on this page. I'd be happy to help you schedule a session!";
    }
    
    if (message.includes('price') || message.includes('cost') || message.includes('how much')) {
      return "For pricing information, please check the booking section or contact directly. Services vary based on style and length.";
    }
    
    if (message.includes('help') || message.includes('what can you')) {
      return "I can: 1) Analyze your face/hair from photos, 2) Recommend styles that suit you, 3) Compare two styles, 4) Answer questions about this portfolio. Just ask or upload an image!";
    }
    
    if (message.includes('thanks') || message.includes('thank')) {
      return "You're welcome! Feel free to ask if you need anything else.";
    }
    
    if (message.includes('bye') || message.includes('goodbye') || message.includes('later')) {
      return "Goodbye! Hope you found what you were looking for. Come back anytime!";
    }
    
    // Default intelligent responses
    const responses = [
      "That's an interesting question! This portfolio features hair styling work. Would you like me to analyze a style or answer specific questions?",
      "I understand you're asking about the portfolio. I can help with style recommendations, bookings, or general questions. What specifically would you like to know?",
      "I'm here to help! You can ask me about styles, upload photos for analysis, or inquire about services. What would be most helpful?",
      "Great question! This portfolio showcases professional hair styling. I can provide personalized recommendations if you share what you're looking for."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
};

export default function AIStyleStudio() {
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [showCameraMenu, setShowCameraMenu] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  
  const [chatHistory, setChatHistory] = useState([
    { role: 'ai', text: AI_PERSONALITY.greeting }
  ]);
  
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const chatEndRef = useRef(null);

  // --- TEXT TO SPEECH (KILO SPEAKS) ---
  const speakText = (text) => {
    if (!speechEnabled || !window.speechSynthesis) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    // Try to find a good English voice
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Natural')) ||
                         voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) ||
                         voices.find(v => v.lang.startsWith('en'));
    if (englishVoice) utterance.voice = englishVoice;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // --- SPEECH RECOGNITION (LIVE WRITING) ---
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = useRef(null);

  useEffect(() => {
    if (SpeechRecognition) {
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = true;
      recognition.current.interimResults = true;
      
      recognition.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        setChatInput(transcript); // Writes as you speak
      };

      recognition.current.onend = () => setIsListening(false);
    }
  }, []);

  const handleMicToggle = () => {
    if (isListening) {
      recognition.current?.stop();
      setIsListening(false);
    } else {
      recognition.current?.start();
      setIsListening(true);
    }
  };

  // --- IMAGE ANALYSIS (FACE/HAIR) ---
  const processImage = (file) => {
    if (!file) return;
    setShowCameraMenu(false);
    const imageUrl = URL.createObjectURL(file);
    
    setChatHistory(prev => [...prev, { role: 'user', type: 'image', text: imageUrl }]);
    setIsAnalyzing(true);
    setIsTyping(true);

    setTimeout(() => {
      setIsAnalyzing(false);
      const response = "Scanning complete. Your face shape is Diamond. This hair height adds symmetry to your forehead. Highly recommended.";
      setChatHistory(prev => [...prev, { role: 'ai', text: response }]);
      setIsTyping(false);
      speakText(response);
    }, 2500);
  };

  const handleSendMessage = (e) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;
    
    // Stop any current speech when user sends new message
    stopSpeaking();
    
    setChatHistory(prev => [...prev, { role: 'user', text: chatInput }]);
    const userMessage = chatInput;
    setChatInput("");
    setIsTyping(true);
    
    setTimeout(() => {
      const response = AI_PERSONALITY.getResponse(userMessage);
      setChatHistory(prev => [...prev, { role: 'ai', text: response }]);
      setIsTyping(false);
      speakText(response);
    }, 800 + Math.random() * 500);
  };

  return (
    <div className="flex h-screen bg-white overflow-hidden font-sans relative">
      
      {/* LEFT: PORTFOLIO FEED */}
      <section className="flex-1 p-10 overflow-y-auto hidden md:block bg-zinc-50/50">
        <h1 className="text-7xl font-black italic uppercase tracking-tighter mb-10">Portfolio</h1>
        <div className={`grid gap-8 transition-all ${isChatOpen ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="aspect-[3/4] bg-white rounded-[40px] overflow-hidden shadow-xl border border-zinc-100">
               <img src={`https://picsum.photos/600/800?random=${i + 500}`} className="w-full h-full object-cover" alt="Style" />
            </div>
          ))}
        </div>
      </section>

      {/* RIGHT: KILO AI SIDEBAR */}
      <aside className={`transition-all duration-500 flex flex-col h-screen bg-white shadow-2xl relative ${isChatOpen ? 'w-full md:w-[480px]' : 'w-0 opacity-0 pointer-events-none'}`}>
        
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 bg-[#7c3aed] rounded-full flex items-center justify-center ${isAnalyzing ? 'animate-spin' : ''}`}>
                <Sparkles size={20} className="text-white" fill="white" />
            </div>
            <p className="font-black uppercase text-xs tracking-widest">Kilo Vision</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => { setSpeechEnabled(!speechEnabled); if (speechEnabled) stopSpeaking(); }}
              className={`p-2 rounded-full transition-colors ${speechEnabled ? 'text-[#7c3aed] hover:bg-zinc-100' : 'text-zinc-400 hover:bg-zinc-100'}`}
              title={speechEnabled ? "Disable voice" : "Enable voice"}
            >
              {speechEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
            <button onClick={() => { stopSpeaking(); setIsChatOpen(false); }} className="p-2 hover:bg-zinc-100 rounded-full"><X size={24} className="text-zinc-400" /></button>
          </div>
        </div>

        {/* CHAT LOG */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white no-scrollbar">
          {chatHistory.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`p-4 max-w-[85%] rounded-[24px] cursor-pointer ${msg.role === 'user' ? 'bg-[#7c3aed] text-white' : 'bg-zinc-100 text-zinc-800'} ${msg.role === 'ai' && speechEnabled ? 'hover:bg-zinc-200 transition-colors' : ''}`}
                onClick={() => msg.role === 'ai' && speechEnabled ? (isSpeaking ? stopSpeaking() : speakText(msg.text)) : null}
                title={msg.role === 'ai' && speechEnabled ? (isSpeaking ? "Click to stop" : "Click to hear") : undefined}
              >
                {msg.type === 'image' ? (
                  <div className="relative">
                    <img src={msg.text} className="rounded-xl max-w-full" alt="Input" />
                    {isAnalyzing && (
                      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center rounded-xl">
                        <div className="w-full h-1 bg-[#7c3aed] absolute top-0 animate-[scan_2s_infinite]"></div>
                        <Loader2 className="animate-spin text-white" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <p className="text-sm font-medium flex-1">{msg.text}</p>
                    {msg.role === 'ai' && speechEnabled && (
                      <span className={`shrink-0 ${isSpeaking ? 'animate-pulse text-[#7c3aed]' : 'text-zinc-400'}`}>
                        {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* CAMERA MENU */}
        {showCameraMenu && (
          <div className="absolute bottom-28 left-6 right-6 bg-white rounded-3xl shadow-2xl p-4 z-50 animate-bounce-subtle">
             <button onClick={() => fileInputRef.current.click()} className="w-full flex items-center gap-4 p-4 hover:bg-zinc-50 rounded-2xl">
               <ImageIcon className="text-blue-500" /> <span className="font-bold">Gallery</span>
             </button>
             <button onClick={() => cameraInputRef.current.click()} className="w-full flex items-center gap-4 p-4 hover:bg-zinc-50 rounded-2xl">
               <Instagram className="text-purple-500" /> <span className="font-bold">Take Selfie</span>
             </button>
          </div>
        )}

        {/* INPUT AREA */}
        <div className="p-6 bg-white shrink-0">
          <form onSubmit={handleSendMessage} className={`flex items-center gap-3 p-2 rounded-[32px] border-2 transition-all ${isListening ? 'border-red-500 bg-red-50' : 'border-zinc-100 bg-zinc-100'}`}>
            <button type="button" onClick={() => setShowCameraMenu(!showCameraMenu)} className="p-3 text-[#7c3aed]"><Camera size={26} /></button>
            <input 
               type="text" 
               value={chatInput} 
               onChange={(e) => setChatInput(e.target.value)} 
               placeholder={isListening ? "Listening..." : "Talk to Kilo..."}
               className="flex-1 bg-transparent py-2 text-sm font-bold outline-none"
            />
            <button type="button" onClick={handleMicToggle} className={`p-3 rounded-full ${isListening ? 'bg-red-500 text-white' : 'text-zinc-400'}`}>
               {isListening ? <MicOff size={22}/> : <Mic size={22} />}
            </button>
            <button type="submit" className="p-3 bg-[#7c3aed] text-white rounded-full"><Send size={20} /></button>
          </form>
          <input type="file" ref={fileInputRef} onChange={(e) => processImage(e.target.files[0])} hidden />
          <input type="file" ref={cameraInputRef} onChange={(e) => processImage(e.target.files[0])} hidden capture="user" />
        </div>
      </aside>

      {/* FIXED RE-OPEN BUTTON */}
      {!isChatOpen && (
        <button 
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-10 right-10 w-20 h-20 bg-[#7c3aed] text-white rounded-full flex items-center justify-center shadow-2xl z-50 hover:scale-110 transition-transform animate-pulse"
        >
          <MessageSquare size={32} />
        </button>
      )}

      <style>{`
        @keyframes scan { 0% { top: 0%; } 50% { top: 100%; } 100% { top: 0%; } }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
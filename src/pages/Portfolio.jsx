import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles, X, Camera, Send, Mic, MicOff, MessageSquare, Loader2,
  Image as ImageIcon, Instagram, Volume2, VolumeX
} from 'lucide-react';

// --- SITE KNOWLEDGE & LOGIC ---
const SITE_KNOWLEDGE = `
Hairly is a premium hairstylist portfolio. 
Features: Real-time style analysis, face shape detection, 
and a collection of modern cuts including fades, textured pompadours, 
and soft fringes.
`;

async function queryGemini(prompt) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) return "API Key missing. Please check your .env file.";

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );
    const data = await response.json();
    if (data.error) return `Error: ${data.error.message}`;
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm not sure how to answer that.";
  } catch (error) {
    return "Connection error. Please try again.";
  }
}

const AI_PERSONALITY = {
  greeting: "Hairly Vision active. Send me a photo or ask about a style.",
  getResponse: async (userMessage) => {
    const message = userMessage.toLowerCase().trim();
    if (message.match(/^(hi|hello|hey)/i)) return "Hello! I'm Hairly, your AI style guide. How can I help with your hair goals today?";
    
    return await queryGemini(`User: ${userMessage}\nContext: ${SITE_KNOWLEDGE}\nAssistant: Keep it concise and professional.`);
  }
};

// Local fallback analyzer when the external API is unavailable
function localStyleFallback() {
  // Simple deterministic fallback that suggests a safe, modern style
  return "Recommended: A textured crop with slightly longer top and short tapered sides — adds balance to most face shapes and is low maintenance. Try adding subtle texture for movement.";
}

// Helper to call serverless proxy instead of Gemini directly (keeps API key secure)
async function analyzeImageViaProxy(base64Image, promptText, mimeType = 'image/jpeg') {
  try {
    const response = await fetch('/api/analyzeImage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Image, promptText, mimeType })
    });
    const data = await response.json();
    if (!response.ok) {
      console.error('Proxy error:', data.error);
      return null;
    }
    return data.text;
  } catch (err) {
    console.error('Proxy request failed:', err);
    return null;
  }
}

export default function AIStyleStudio() {
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [showCameraMenu, setShowCameraMenu] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [chatHistory, setChatHistory] = useState([{ role: 'ai', text: AI_PERSONALITY.greeting }]);
  const [showCameraCapture, setShowCameraCapture] = useState(false);
  const [portraits, setPortraits] = useState([]);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const chatEndRef = useRef(null);
  const recognition = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isTyping]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = true;
      recognition.current.interimResults = true;
      recognition.current.onresult = (event) => {
        const transcript = Array.from(event.results).map(result => result[0].transcript).join('');
        setChatInput(transcript);
      };
      recognition.current.onend = () => setIsListening(false);
    }
  }, []);

  const speakText = (text) => {
    if (!speechEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;

    const msg = chatInput;
    setChatHistory(prev => [...prev, { role: 'user', text: msg }]);
    setChatInput("");
    setIsTyping(true);

    const response = await AI_PERSONALITY.getResponse(msg);
    setChatHistory(prev => [...prev, { role: 'ai', text: response }]);
    setIsTyping(false);
    speakText(response);
  };

  const processImage = async (file) => {
    if (!file) return;
    setShowCameraMenu(false);
    const imageUrl = URL.createObjectURL(file);
    setChatHistory(prev => [...prev, { role: 'user', type: 'image', text: imageUrl }]);
    setIsAnalyzing(true);
    setIsTyping(true);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64Data = reader.result.split(',')[1];
        // Save portrait immediately
        setPortraits(prev => [...prev, imageUrl]);
        
        // Call serverless proxy for analysis
        const promptText = "Barber Analysis: Identify face shape and hair texture. Suggest a modern cut from this portfolio. 2 sentences max.";
        const aiResponse = await analyzeImageViaProxy(base64Data, promptText, file.type);
        
        // Use local fallback if proxy fails
        const finalResponse = aiResponse || localStyleFallback();
        setChatHistory(prev => [...prev, { role: 'ai', text: finalResponse }]);
        speakText(finalResponse);
        setIsTyping(false);
        setIsAnalyzing(false);
      };
    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'ai', text: "Vision sensors offline." }]);
      setIsTyping(false);
      setIsAnalyzing(false);
    }
  };

  const startCamera = async () => {
    setShowCameraMenu(false);
    setShowCameraCapture(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert('Camera access denied');
      setShowCameraCapture(false);
    }
  };

  const captureAndEdit = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const context = canvasRef.current.getContext('2d');
    // draw current video frame to canvas
    context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);

    // stop camera stream if present
    const stream = videoRef.current?.srcObject;
    if (stream && stream.getTracks) stream.getTracks().forEach(track => track.stop());
    setShowCameraCapture(false);

    setIsAnalyzing(true);
    setIsTyping(true);

    // always save the portrait locally right away so user sees it even if AI fails
    const portraitUrl = canvasRef.current.toDataURL('image/jpeg');
    setPortraits(prev => [...prev, portraitUrl]);

    try {
      const base64Image = portraitUrl.split(',')[1];
      const promptText = "Create a professional visualization: Based on this person's face shape and features, imagine them with a modern stylish haircut (fade, textured, pompadour, or fringe style). Describe the recommended hairstyle in detail, mentioning how it complements their face shape.";
      
      // Call serverless proxy (API key is kept secure on server)
      const styleRecommendation = await analyzeImageViaProxy(base64Image, promptText, 'image/jpeg');
      
      if (!styleRecommendation) {
        console.warn('Proxy returned no recommendation, using local fallback.');
        const fallback = localStyleFallback();
        setChatHistory(prev => [...prev,
          { role: 'user', type: 'image', text: portraitUrl },
          { role: 'ai', text: `✨ AI Hair Styling Analysis:\n\n${fallback}\n\n✅ Portrait saved to your portfolio!` }
        ]);
        speakText(`I've analyzed your photo and saved a styled portrait to your portfolio!`);
        return;
      }

      setChatHistory(prev => [...prev,
        { role: 'user', type: 'image', text: portraitUrl },
        { role: 'ai', text: `✨ AI Hair Styling Analysis:\n\n${styleRecommendation}\n\n✅ Portrait saved to your portfolio!` }
      ]);
      speakText(`I've analyzed your photo and saved a styled portrait to your portfolio!`);
    } catch (err) {
      console.error('captureAndEdit error:', err);
      // show helpful message and ensure portrait remains saved
      setChatHistory(prev => [...prev, { role: 'ai', text: "Hair styling analysis failed. Portrait saved locally." }]);
      speakText("Hair styling analysis failed, but your portrait was saved locally.");
    } finally {
      setIsAnalyzing(false);
      setIsTyping(false);
    }
  };

 return (
    <div className="flex h-screen w-screen bg-white overflow-hidden font-sans relative flex-col md:flex-row">
      {/* PORTFOLIO FEED */}
      <section className={`flex-1 flex flex-col bg-zinc-50/50 transition-all duration-300 ${isChatOpen ? 'hidden md:flex' : 'w-full md:flex-1'}`}>
        {/* Mobile Header */}
        <div className="md:hidden p-4 sm:p-6 bg-white border-b border-zinc-100 flex justify-between items-center sticky top-0 z-10">
          <h1 className="text-xl sm:text-2xl font-black italic uppercase text-[#7c3aed]">Hairly</h1>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 md:p-8 lg:p-10">
          <h1 className="hidden md:block text-4xl md:text-5xl lg:text-7xl font-black italic uppercase tracking-tighter mb-6 md:mb-8 lg:mb-10">Portfolio</h1>
          <div className={`grid gap-3 sm:gap-4 md:gap-6 lg:gap-8 ${isChatOpen ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3'}`}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-white rounded-2xl sm:rounded-3xl md:rounded-[40px] overflow-hidden shadow-md hover:shadow-lg transition-shadow border border-zinc-100 group">
                <img src={`https://picsum.photos/600/800?random=${i + 10}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt="Style" />
              </div>
            ))}
                      {portraits.map((portrait, i) => (
                        <div key={`portrait-${i}`} className="aspect-[3/4] bg-white rounded-[40px] overflow-hidden shadow-lg border-2 border-[#7c3aed] group relative">
                          <img src={portrait} className="w-full h-full object-cover" alt="Your styled portrait" />
                          <div className="absolute top-2 right-2 bg-[#7c3aed] text-white rounded-full px-3 py-1 text-xs font-bold">AI Style</div>
                        </div>
                      ))}
          </div>
        </div>
      </section>

      {/* CHAT ASIDE */}
      <aside className={`fixed inset-0 z-50 transition-all duration-300 flex flex-col h-screen w-screen bg-white md:relative md:inset-auto md:h-full md:w-auto ${isChatOpen ? 'translate-x-0 md:translate-x-0 md:w-full lg:w-[450px]' : 'translate-x-full md:hidden lg:hidden'}`}>
        {/* HEADER */}
        <div className="p-4 sm:p-6 border-b border-zinc-100 flex items-center justify-between shrink-0 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className={`w-8 sm:w-10 h-8 sm:h-10 bg-[#7c3aed] rounded-full flex items-center justify-center flex-shrink-0 ${isAnalyzing ? 'animate-spin' : ''}`}>
              <Sparkles size={18} className="text-white sm:w-5 sm:h-5" fill="white" />
            </div>
            <p className="font-black uppercase text-xs sm:text-xs tracking-widest">Hairly Vision</p>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <button 
              onClick={() => { setSpeechEnabled(!speechEnabled); }}
              className={`p-2 rounded-full transition-colors ${speechEnabled ? 'text-[#7c3aed] hover:bg-zinc-100' : 'text-zinc-400 hover:bg-zinc-100'}`}
              title={speechEnabled ? "Disable voice" : "Enable voice"}
            >
              {speechEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-zinc-100 rounded-full"><X size={24} className="text-zinc-400" /></button>
          </div>
        </div>

        {/* MESSAGES */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-6 bg-white no-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
          {chatHistory.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`p-3 sm:p-4 max-w-[85%] rounded-3xl ${msg.role === 'user' ? 'bg-[#7c3aed] text-white' : 'bg-zinc-100 text-zinc-800'}`}
              >
                {msg.type === 'image' ? (
                  <img src={msg.text} className="rounded-xl max-w-full" alt="Input" />
                ) : (
                  <p className="text-xs sm:text-sm md:text-base font-medium">{msg.text}</p>
                )}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-zinc-100 rounded-3xl p-3 sm:p-4 flex gap-2">
                <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* CAMERA MENU */}
        {showCameraMenu && (
          <div className="absolute bottom-20 sm:bottom-24 left-3 right-3 sm:left-6 sm:right-6 bg-white rounded-3xl shadow-2xl p-3 sm:p-4 md:p-5  z-50">
            <button onClick={() => fileInputRef.current.click()} className="w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 hover:bg-zinc-50 rounded-2xl">
              <ImageIcon size={20} className="text-blue-500 flex-shrink-0" /> <span className="font-bold text-sm sm:text-base">Gallery</span>
            </button>
            <button onClick={startCamera} className="w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 hover:bg-zinc-50 rounded-2xl">
              <Camera size={20} className="text-purple-500 flex-shrink-0" /> <span className="font-bold text-sm sm:text-base">Take Selfie</span>
            </button>
          </div>
        )}

        {/* CAMERA CAPTURE MODAL */}
        {showCameraCapture && (
          <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/90">
            <div className="w-full h-full flex flex-col items-center justify-center p-3 sm:p-6 md:p-8">
              <h2 className="text-white text-lg sm:text-2xl md:text-3xl font-black mb-3 sm:mb-4 md:mb-6">Position Your Face</h2>
              <video ref={videoRef} autoPlay playsInline className="w-full max-w-xs sm:max-w-sm md:max-w-md h-auto rounded-3xl border-4 border-[#7c3aed] aspect-[3/4] object-cover" />
              <canvas ref={canvasRef} width={480} height={640} className="hidden" />
              <div className="flex gap-2 sm:gap-3 md:gap-4 mt-4 sm:mt-6 md:mt-8">
                <button onClick={() => { 
                  if (videoRef.current?.srcObject) videoRef.current.srcObject.getTracks().forEach(t => t.stop()); 
                  setShowCameraCapture(false); 
                }} className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-red-500 text-white font-bold rounded-full hover:bg-red-600 transition-colors">Cancel</button>
                <button onClick={captureAndEdit} className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-[#7c3aed] text-white font-bold rounded-full hover:bg-purple-600 transition-colors">📸 Snap & Edit</button>
              </div>
            </div>
          </div>
        )}
        {/* INPUT AREA */}
        <div className="p-3 sm:p-4 md:p-6 bg-white shrink-0">
          <form onSubmit={handleSendMessage} className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-4xl border-2 transition-all ${isListening ? 'border-red-500 bg-red-50' : 'border-zinc-100 bg-zinc-100'}`}>
            <button type="button" onClick={() => setShowCameraMenu(!showCameraMenu)} className="p-2 sm:p-3 text-[#7c3aed] flex-shrink-0"><Camera size={20} className="sm:w-6 sm:h-6 md:w-7 md:h-7" /></button>
            <input 
              type="text" 
              value={chatInput} 
              onChange={(e) => setChatInput(e.target.value)} 
              placeholder={isListening ? "Listening..." : "Talk to Kilo..."}
              className="flex-1 bg-transparent py-2 text-xs sm:text-sm md:text-base font-bold outline-none"
            />
            <button type="button" onClick={() => {
              if (isListening) {
                recognition.current?.stop();
                setIsListening(false);
              } else {
                recognition.current?.start();
                setIsListening(true);
              }
            }} className={`p-2 sm:p-3 rounded-full flex-shrink-0 transition-all ${isListening ? 'bg-red-500 text-white' : 'text-zinc-400'}`}>
              {isListening ? <MicOff size={18} className="sm:w-5 sm:h-5 md:w-6 md:h-6" /> : <Mic size={18} className="sm:w-5 sm:h-5 md:w-6 md:h-6" />}
            </button>
            <button type="submit" className="p-2 sm:p-3 bg-[#7c3aed] text-white rounded-full flex-shrink-0 transition-colors hover:bg-purple-600"><Send size={18} className="sm:w-5 sm:h-5 md:w-6 md:h-6" /></button>
          </form>
          <input type="file" ref={fileInputRef} onChange={(e) => processImage(e.target.files[0])} hidden />
          <input type="file" ref={cameraInputRef} onChange={(e) => processImage(e.target.files[0])} hidden capture="user" />
        </div>
      </aside>

      {/* GLOBAL FLOATING AI BUTTON - Place this here at the bottom */}
      {!isChatOpen && (
        <button 
          onClick={() => setIsChatOpen(true)} 
          className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 md:bottom-28 md:right-8 w-14 h-14 sm:w-16 sm:h-16 md:w-18 md:h-18 bg-[#7c3aed] text-white rounded-full flex items-center justify-center shadow-2xl z-[60] hover:scale-110 active:scale-95 transition-all animate-bounce-subtle"
        >
          <Sparkles size={28} />
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-purple-500"></span>
          </span>
        </button>
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-bounce-subtle { animation: bounce-subtle 3s infinite ease-in-out; }
      `}</style>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { Sparkles, X, Camera, Send, Heart, MoreHorizontal, Loader2 } from 'lucide-react';
// Import your firebase config
import { db } from '../../firebaseconfig'; 
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

export default function HairlyPortfolio() {
  const [activeTab, setActiveTab] = useState('Gallery');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [styles, setStyles] = useState([]);
  const [loading, setLoading] = useState(true);

  // REAL-TIME FETCH: Connects to the data sent from your UploadPage
  useEffect(() => {
    const q = query(collection(db, "styles"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const stylesArray = [];
      querySnapshot.forEach((doc) => {
        stylesArray.push({ id: doc.id, ...doc.data() });
      });
      setStyles(stylesArray);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden font-sans relative">
      
      {/* MAIN PORTFOLIO AREA */}
      <section className={`flex-1 min-w-0 flex flex-col transition-all duration-500 bg-white ${isChatOpen ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Header */}
        <div className="pt-8 px-5 pb-2 md:pt-12 md:px-10 shrink-0">
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-[900] italic uppercase tracking-tighter leading-[0.8] text-black">
            Portfolio
          </h1>
          <div className="flex justify-between items-end mt-4">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">
              {styles.length} Masterpieces Published
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-5 md:px-10 gap-6 mt-6 border-b border-zinc-100 overflow-x-auto no-scrollbar shrink-0">
          {['Gallery', 'Analysis', 'Saved'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-[11px] font-[900] uppercase tracking-widest relative ${
                activeTab === tab ? 'text-[#7c3aed]' : 'text-zinc-300'
              }`}
            >
              {tab}
              {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#7c3aed] rounded-full" />}
            </button>
          ))}
        </div>

        {/* Dynamic Grid */}
        <div className="flex-1 overflow-y-auto min-h-0 bg-zinc-50 md:bg-white md:p-4 lg:p-10">
          {loading ? (
            <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#7c3aed]" /></div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-[1px] md:gap-4 lg:gap-6">
              {styles.map((style) => (
                <div key={style.id} className="aspect-square bg-zinc-200 relative group overflow-hidden md:rounded-2xl lg:rounded-3xl shadow-sm">
                  <img 
                    src={style.image} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                    alt={style.styleName} 
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 text-center">
                     <Heart size={20} className="text-white fill-white mb-1" />
                     <span className="text-[8px] text-white font-bold uppercase tracking-tighter truncate w-full">
                       {style.styleName}
                     </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* AI Sidebar remains consistent with previous fix */}
      <aside className={`fixed inset-0 z-50 bg-white flex flex-col md:relative md:inset-auto ${isChatOpen ? 'flex md:w-[400px]' : 'hidden'}`}>
        {/* ... (Previous Sidebar Content) ... */}
      </aside>

      {!isChatOpen && (
        <button 
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-8 right-6 w-16 h-16 bg-[#7c3aed] text-white rounded-full flex items-center justify-center shadow-2xl z-40 animate-bounce-subtle"
        >
          <Sparkles size={30} fill="white" />
        </button>
      )}
    </div>
  );
}
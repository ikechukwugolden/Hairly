import React from 'react';
import { 
  User, Phone, MessageCircle, Calendar, 
  ChevronRight, Scissors, Info 
} from 'lucide-react';

export default function ClientProfile({ client }) {
  // If no client is passed yet, show a fallback
  if (!client) return <div className="p-10 text-hairly-muted">Select a client to view profile...</div>;

  return (
    <div className="flex flex-col h-full bg-hairly-bg text-white animate-in fade-in duration-500">
      
      {/* 1. HERO HEADER */}
      <div className="p-8 border-b border-hairly-surface bg-gradient-to-b from-hairly-primary/10 to-transparent">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-hairly-surface border-2 border-hairly-primary flex items-center justify-center overflow-hidden">
            {client.image ? <img src={client.image} alt="" className="w-full h-full object-cover" /> : <User size={40} />}
          </div>
          <div className="flex-1">
            <h2 className="text-3xl font-black uppercase italic leading-none mb-1">{client.name}</h2>
            <p className="text-hairly-muted font-bold text-xs tracking-widest uppercase">Member since {client.joinedDate}</p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button className="flex-1 py-4 bg-hairly-surface rounded-2xl flex items-center justify-center gap-2 font-black uppercase text-xs hover:bg-hairly-primary transition-all">
            <Phone size={16} /> Call
          </button>
          <button className="flex-1 py-4 bg-hairly-primary rounded-2xl flex items-center justify-center gap-2 font-black uppercase text-xs shadow-lg shadow-hairly-primary/30">
            <MessageCircle size={16} /> WhatsApp
          </button>
        </div>
      </div>

      {/* 2. HAIR STATS (The "Technical" Specs) */}
      <div className="p-8 space-y-4">
        <h3 className="text-hairly-primary font-black uppercase text-xs tracking-[0.2em] flex items-center gap-2">
          <Scissors size={14} /> Style Profile
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 bg-hairly-surface rounded-2xl border border-white/5">
            <span className="block text-[10px] text-hairly-muted uppercase font-black mb-1">Texture</span>
            <span className="font-bold text-sm italic">Coarse / Curly</span>
          </div>
          <div className="p-4 bg-hairly-surface rounded-2xl border border-white/5">
            <span className="block text-[10px] text-hairly-muted uppercase font-black mb-1">Last Cut</span>
            <span className="font-bold text-sm italic">Fringe + Taper</span>
          </div>
        </div>
      </div>

      {/* 3. HISTORY TIMELINE */}
      <div className="px-8 flex-1">
        <h3 className="text-hairly-primary font-black uppercase text-xs tracking-[0.2em] mb-4 flex items-center gap-2">
          <Calendar size={14} /> Appointment History
        </h3>
        <div className="space-y-4">
          {client.history?.map((entry, i) => (
            <div key={i} className="flex items-start gap-4 p-4 bg-hairly-surface/30 rounded-2xl border-l-2 border-hairly-primary">
              <div className="flex-1">
                <p className="font-bold text-sm">{entry.service}</p>
                <p className="text-[10px] text-hairly-muted font-bold">{entry.date}</p>
              </div>
              <ChevronRight size={16} className="text-hairly-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
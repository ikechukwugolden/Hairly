import { useState } from 'react';
import { ChevronLeft, Plus } from 'lucide-react';

export default function Portfolio() {
  const [activeTab, setActiveTab] = useState('Preview');
  
  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="bg-[#7c3aed] p-6 pt-12 text-white flex items-center gap-4">
        <ChevronLeft size={24} />
        <h1 className="font-bold text-lg">My Styles</h1>
      </div>

      <div className="flex justify-around p-4 border-b border-zinc-100">
        {['Preview', 'Saved', 'Uploads'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2 rounded-full text-xs font-bold transition-all ${activeTab === tab ? 'bg-[#7c3aed] text-white' : 'text-zinc-400 bg-zinc-50'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Total</span>
          <span className="text-xs font-bold">150</span>
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-zinc-100 overflow-hidden shadow-sm">
               <img src={`https://picsum.photos/200/200?random=${i}`} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      </div>

      {/* Floating Action Button */}
      <button className="fixed bottom-24 right-6 w-12 h-12 bg-[#7c3aed] rounded-full flex items-center justify-center text-white shadow-lg shadow-purple-200 border-2 border-white">
        <Plus size={24} />
      </button>
    </div>
  );
}
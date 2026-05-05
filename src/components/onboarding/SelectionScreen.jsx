// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';

export const SelectionScreen = ({ onChoice }) => (
  <motion.div 
    initial={{ opacity: 0, x: 50 }} 
    animate={{ opacity: 1, x: 0 }} 
    exit={{ opacity: 0, x: -50 }}
    className="min-h-screen bg-white flex flex-col items-center justify-center p-8"
  >
    <h1 className="text-6xl font-black text-[#7c3aed] italic mb-10 tracking-tighter">Hairly</h1>
    <h2 className="text-2xl font-bold text-zinc-800 mb-2">Welcome!</h2>
    <p className="text-zinc-500 font-medium mb-12 text-center px-6">
      How would you like to use the platform today?
    </p>
    
    <div className="flex flex-row gap-4 w-full max-w-md">
      <button 
        onClick={() => onChoice('client')} 
        className="w-full py-5 bg-[#7c3aed] text-white rounded-[24px] font-bold shadow-xl shadow-purple-100 hover:bg-[#6d28d9] hover:text-[black] hover:bg-[#f8b9f0] transition-all active:scale-95"
      >
        I am a Client
      </button>
      
      <button 
        onClick={() => onChoice('stylist')} 
        className="w-full py-5 bg-[#7c3aed] text-white rounded-[24px] font-bold shadow-xl shadow-purple-100 hover:bg-[#6d28d9] hover:bg-[#f8b9f0] hover:text-[black] transition-all active:scale-95"
      >
        I am a Stylist
      </button>
    </div>
  </motion.div>
);

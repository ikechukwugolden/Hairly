import { motion } from 'framer-motion';

export const SelectionScreen = ({ onChoice }) => (
  <motion.div 
    initial={{ opacity: 0, x: 50 }} 
    animate={{ opacity: 1, x: 0 }} 
    exit={{ opacity: 0, x: -50 }}
    className="min-h-screen bg-white flex flex-col items-center justify-center p-8"
  >
    <h1 className="text-6xl font-black text-[#7c3aed] italic mb-20 tracking-tighter">Hairly</h1>
    <p className="text-zinc-500 font-bold mb-10">How would you like to use Hairly?</p>
    
    <div className="flex gap-4 w-full max-w-sm">
      <button onClick={onChoice} className="flex-1 py-4 bg-[#7c3aed] text-white rounded-2xl font-bold shadow-lg shadow-purple-200">
        Client
      </button>
      <button onClick={onChoice} className="flex-1 py-4 bg-[#7c3aed] text-white rounded-2xl font-bold shadow-lg shadow-purple-200">
        Stylist
      </button>
    </div>
  </motion.div>
);
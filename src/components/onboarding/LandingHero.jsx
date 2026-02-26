// src/components/home/Hero.jsx
import { motion } from 'framer-motion';
import heroImage from '../../assets/image1.png';

export const LandingHero = ({ onStart }) => { // Added onStart prop
  return (
    <section className="relative w-full h-screen flex flex-col bg-[#0f071e]">
      <div className="relative w-full h-[65vh] overflow-hidden">
        <div 
          className="absolute inset-0 z-0"
          style={{ clipPath: 'ellipse(100% 100% at 50% 0%)' }}
        >
          <img src={heroImage} alt="Hairly" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-purple-900/20" />
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center relative z-10 bg-gradient-to-b from-transparent via-[#2e1065] to-[#1a0f2e] pb-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-6"
        >
          <h1 className="text-4xl mt-4 md:text-6xl font-black text-white tracking-tight">
            Welcome to Hairly
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-sm mx-auto font-light leading-relaxed">
            Everything your hair needs, <br /> in one place.
          </p>

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <button
              onClick={onStart} // Triggers the navigation logic
              className="px-20 py-4 bg-[#7c3aed] text-white text-lg font-bold rounded-3xl shadow-xl shadow-purple-900/40 transition-colors"
            >
              Get Started
            </button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
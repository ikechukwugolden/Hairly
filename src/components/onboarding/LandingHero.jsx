import { motion } from 'framer-motion';
import heroImage from '../../assets/image1.png';

export const LandingHero = ({ onStart }) => {
  return (
    <section className="relative w-full min-h-screen flex flex-col md:flex-row bg-[#0f071e] overflow-hidden">
      
      {/* IMAGE SECTION */}
      {/* Mobile: Top 60% of screen | Desktop: Right side 50% of screen */}
      <div className="relative w-full h-[60vh] md:h-screen md:w-1/2 md:order-2 overflow-hidden">
        <div 
          className="absolute inset-0 z-0 md:clip-none"
          // Keep the curve for mobile, remove it for a clean split on desktop
          style={{ clipPath: window.innerWidth < 768 ? 'ellipse(100% 100% at 50% 0%)' : 'none' }}
        >
          <img 
            src={heroImage} 
            alt="Hairly" 
            className="w-full h-full object-cover object-center md:object-right" 
          />
          {/* Overlay for better text contrast on desktop if needed */}
          <div className="absolute inset-0 bg-purple-900/20 md:bg-transparent" />
        </div>
      </div>

      {/* CONTENT SECTION */}
      {/* Mobile: Bottom 40% | Desktop: Left side 50% centered */}
      <div className="flex-1 md:w-1/2 flex flex-col items-center justify-center px-6 md:px-16 text-center md:text-left relative z-10 bg-gradient-to-b from-transparent via-[#2e1065] to-[#1a0f2e] md:bg-none md:order-1">
        
        {/* Background Glow for Desktop (Subtle purple orb behind text) */}
        <div className="hidden md:block absolute -left-20 top-1/4 w-96 h-96 bg-purple-600/20 blur-[120px] rounded-full" />

        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-6 md:space-y-8 max-w-xl relative z-20"
        >
          <h1 className="text-5xl md:text-8xl font-black text-white tracking-tighter leading-none">
            Welcome to <span className="text-[#cc5c89]">Hairly</span>
          </h1>
          
          <p className="text-lg md:text-2xl text-white/80 max-w-sm md:max-w-md mx-auto md:mx-0 font-light leading-relaxed">
            Everything your hair needs, <br className="md:hidden" /> 
            <span className="md:inline"> managed in one powerful platform.</span>
          </p>

          <motion.div 
            whileHover={{ scale: 1.05 }} 
            whileTap={{ scale: 0.95 }}
            className="flex justify-center md:justify-start"
          >
            <button
              onClick={onStart}
              className="w-full sm:w-auto px-16 py-5  bg-[#7c3aed] text-[#fddcf4] text-xl font-semibold rounded-2xl shadow-2xl shadow-purple-900/40 hover:bg-[#f8b9f0] hover:text-yellow-400 transition-all"
            >
              Get Started
            </button>
          </motion.div>
        </motion.div>
      </div>

      {/* Subtle Bottom Accent for Desktop */}
      <div className="hidden md:block absolute bottom-10 left-16 text-white/30 text-xs font-bold tracking-[0.2em] uppercase">
        © 2026 Hairly Platform
      </div>
    </section>
  );
};
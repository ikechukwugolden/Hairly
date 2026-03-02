import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

import heroImage from '../../assets/image2.png';
import oneImage from '../../assets/image4.png';
import twoImage from '../../assets/image3.png';

const slides = [
  {
    title: "Get Discovered Online",
    desc: "Upload your portfolio and let new clients discover your skills even if they don't know your shop.",
    img: oneImage
  },
  {
    title: "Reduce Style Mistakes",
    desc: "Help Clients See Their Style Before You Start with AI preview to align expectations",
    img: twoImage
  },
  {
    title: "Manage Business Digitally",
    desc: "Keep client records, view insights, and grow your business with simple digital tools.",
    img: heroImage
  }
];

export const OnboardingFlow = ({ onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const data = slides[currentIndex];

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      if (onComplete) onComplete();
    }
  };

  return (
    <div className="bg-[#0f071e] min-h-screen flex flex-col md:flex-row overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div 
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }} 
          animate={{ opacity: 1, x: 0 }} 
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.4 }}
          className="w-full min-h-screen flex flex-col md:flex-row"
        >
          {/* IMAGE SECTION */}
          {/* Mobile: 60vh | Desktop: 50% width, full height */}
          <div className="relative w-full h-[55vh] md:h-screen md:w-1/2 overflow-hidden">
            <div 
              className="absolute inset-0 z-0 transition-all duration-700" 
              // Curve only on mobile
              style={{ clipPath: window.innerWidth < 768 ? 'ellipse(100% 100% at 50% 0%)' : 'none' }}
            >
              <img 
                src={data.img} 
                className="w-full h-full object-cover" 
                alt="onboarding" 
              />
              {/* Desktop Overlay Gradient */}
              <div className="hidden md:block absolute inset-0 bg-gradient-to-r from-[#0f071e] via-transparent to-transparent" />
            </div>
          </div>

          {/* CONTENT SECTION */}
          <div className="flex-1 px-8 md:px-16 pt-12 md:pt-0 pb-20 md:pb-0 bg-gradient-to-b from-transparent via-[#2e1065] to-[#1a0f2e] md:bg-none -mt-16 md:mt-0 relative z-10 flex flex-col justify-center">
            <div className="max-w-md mx-auto md:mx-0">
              <div className="space-y-4 md:space-y-6 mb-12">
                <motion.h2 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-3xl md:text-5xl font-black leading-tight text-white"
                >
                  {data.title}
                </motion.h2>
                <motion.p 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-white/70 text-lg md:text-xl leading-relaxed font-light"
                >
                  {data.desc}
                </motion.p>
              </div>

              <div className="flex justify-between items-center max-w-sm md:max-w-none">
                {/* Progress Dots */}
                <div className="flex gap-2">
                  {slides.map((_, i) => (
                    <div 
                      key={i} 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        i === currentIndex ? 'bg-[#7c3aed] w-8' : 'bg-white/20 w-2'
                      }`} 
                    />
                  ))}
                </div>

                {/* Next Arrow */}
                <button 
                  onClick={handleNext} 
                  className="p-5 md:p-6 bg-[#7c3aed] text-white rounded-full shadow-lg shadow-purple-900/40 hover:bg-[#8b5cf6] transition-all transform hover:scale-110 active:scale-95 flex items-center justify-center"
                >
                  <ChevronRight size={32} strokeWidth={3} />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
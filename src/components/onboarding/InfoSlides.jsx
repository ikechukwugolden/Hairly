import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

// Use correct imports for your local assets
import heroImage from '../../assets/image2.png';
import oneImage from '../../assets/image4.png';
import twoImage from '../../assets/image3.png';

// 1. Fixed the 'exportconst' typo
// 2. Renamed to 'slides' to match your component logic below
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
      // Use the prop from App.jsx to move to the signup state
      if (onComplete) onComplete();
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div 
        key={currentIndex}
        initial={{ opacity: 0, x: 20 }} 
        animate={{ opacity: 1, x: 0 }} 
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.4 }}
        className="relative min-h-screen flex flex-col bg-[#0f071e]"
      >
        {/* Curved Dome Image */}
        <div className="relative w-full h-[60vh] overflow-hidden">
          <div 
            className="absolute inset-0 z-0" 
            style={{ clipPath: 'ellipse(100% 100% at 50% 0%)' }}
          >
            <img 
              src={data.img} 
              className="w-full h-full object-cover" 
              alt="onboarding" 
            />
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-1 px-10 pt-12 pb-20 bg-gradient-to-b from-transparent via-[#2e1065] to-[#1a0f2e] -mt-20 relative z-10 flex flex-col justify-between">
          <div className="space-y-4">
            <h2 className="text-3xl font-black leading-tight text-white">{data.title}</h2>
            <p className="text-white/70 text-lg leading-relaxed">{data.desc}</p>
          </div>

          <div className="flex justify-between items-center">
            {/* Progress Dots */}
            <div className="flex gap-2">
              {slides.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === currentIndex ? 'bg-white w-8' : 'bg-white/30 w-2'
                  }`} 
                />
              ))}
            </div>

            {/* Next Arrow */}
            <button 
              onClick={handleNext} 
              className="p-4 bg-white/10 rounded-full border border-white/20 hover:bg-white/20 transition-all text-white"
            >
              <ChevronRight size={28} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
import { useState } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

const onboardingData = [
  {
    title: "Revolutionize Your Style",
    desc: "Discover top-tier stylists or showcase your unique craft to the world.",
    img: "/stylist1.png", 
  },
  {
    title: "Visualise the Result",
    desc: "Use AI previews to see hair styles before the first cut, ensuring perfect alignment.",
    img: "/stylist2.png",
  },
  {
    title: "Seamless Bookings",
    desc: "Manage appointments or find the perfect time slot with simple digital tools.",
    img: "/stylist3.png",
  }
];

export const OnboardingFlow = ({ onFinish }) => {
  const [index, setIndex] = useState(0);
  const current = onboardingData[index];

  const handleNext = () => {
    if (index < onboardingData.length - 1) {
      setIndex(index + 1);
    } else {
      onFinish();
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#0f071e] text-white">
      {/* The Curved Image Area with Smooth Transitions */}
      <div className="relative h-[60vh] overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div 
            key={index}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 z-0" 
            style={{ clipPath: 'ellipse(100% 100% at 50% 0%)' }}
          >
            <img src={current.img} className="w-full h-full object-cover" alt="onboarding" />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* The Content Area */}
      <div className="flex-1 px-10 pt-10 pb-12 flex flex-col justify-between -mt-20 relative z-10 bg-gradient-to-b from-transparent via-[#2e1065] to-[#1a0f2e]">
        <AnimatePresence mode="wait">
          <motion.div 
            key={index}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="space-y-4"
          >
            <h2 className="text-3xl font-black italic tracking-tighter">{current.title}</h2>
            <p className="text-white/70 leading-relaxed text-lg">{current.desc}</p>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between">
          {/* Progress Dots */}
          <div className="flex gap-2">
            {onboardingData.map((_, i) => (
              <div 
                key={i} 
                className={`h-2 rounded-full transition-all duration-300 ${i === index ? 'bg-white w-6' : 'bg-white/30 w-2'}`} 
              />
            ))}
          </div>

          {/* Next Button */}
          <button 
            onClick={handleNext}
            className="p-4 bg-white/10 border border-white/20 rounded-full hover:bg-white/20 active:scale-90 transition-all"
          >
            <ChevronRight size={28} />
          </button>
        </div>
      </div>
    </div>
  );
};

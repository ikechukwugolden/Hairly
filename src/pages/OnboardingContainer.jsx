import { useState } from 'react';
import { ChevronRight } from 'lucide-react';

const onboardingData = [
  {
    title: "Get Discovered Online",
    desc: "Upload your portfolio and let new clients discover your skills even if they don't know your shop.",
    img: "/stylist1.png", // Replace with your image paths
  },
  {
    title: "Reduce Style Mistakes",
    desc: "Help Clients See Their Style Before You Start with AI preview to align expectations",
    img: "/stylist2.png",
  },
  {
    title: "Manage Your Business Digitally",
    desc: "Keep client records, view insights, and grow your business with simple digital tools.",
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
    <div className="h-screen flex flex-col bg-[#0f071e]">
      {/* The Curved Image Area */}
      <div className="relative h-[60vh] overflow-hidden">
        <div 
          className="absolute inset-0 z-0" 
          style={{ clipPath: 'ellipse(100% 100% at 50% 0%)' }}
        >
          <img src={current.img} className="w-full h-full object-cover" alt="onboarding" />
        </div>
      </div>

      {/* The Content Area */}
      <div className="flex-1 px-10 pt-10 pb-12 flex flex-col justify-between -mt-20 relative z-10 bg-gradient-to-b from-transparent via-[#2e1065] to-[#1a0f2e]">
        <div className="space-y-4">
          <h2 className="text-3xl font-black">{current.title}</h2>
          <p className="text-white/70 leading-relaxed text-lg">{current.desc}</p>
        </div>

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
            className="p-4 bg-white/10 border border-white/20 rounded-full hover:bg-white/20"
          >
            <ChevronRight size={28} />
          </button>
        </div>
      </div>
    </div>
  );
};
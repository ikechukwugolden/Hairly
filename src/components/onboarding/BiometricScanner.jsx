import React, { useState } from 'react';
import { motion as Motion } from 'framer-motion';
import { Fingerprint, CheckCircle2 } from 'lucide-react';

export const BiometricScanner = ({ onComplete }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const handleScan = async () => {
    if (isDone) return;
    
    setIsScanning(true);
    
    // Simulate a high-tech scan duration
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsScanning(false);
    setIsDone(true);
    
    if (onComplete) {
      setTimeout(onComplete, 800);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-zinc-50 rounded-[40px] border border-zinc-100">
      <div className="relative mb-6">
        {/* Pulsing Outer Rings during scan */}
        {isScanning && (
          <>
            <Motion.div 
              initial={{ scale: 0.8, opacity: 0.5 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="absolute inset-0 bg-[#7c3aed]/20 rounded-full"
            />
            <Motion.div 
              initial={{ scale: 0.8, opacity: 0.5 }}
              animate={{ scale: 1.8, opacity: 0 }}
              transition={{ repeat: Infinity, duration: 1.5, delay: 0.5 }}
              className="absolute inset-0 bg-[#7c3aed]/10 rounded-full"
            />
          </>
        )}

        {/* The Main Scanner Button */}
        <Motion.button
          onMouseDown={handleScan}
          onTouchStart={handleScan}
          whileTap={{ scale: 0.92 }}
          className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-colors duration-500 shadow-xl ${
            isDone ? 'bg-green-500 text-white' : 'bg-white text-[#7c3aed]'
          }`}
        >
          {isDone ? (
            <Motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
              <CheckCircle2 size={48} />
            </Motion.div>
          ) : (
            <Fingerprint size={48} className={isScanning ? "animate-pulse" : ""} />
          )}

          {/* Scanning Progress Line */}
          {isScanning && (
            <Motion.div 
              initial={{ top: "0%" }}
              animate={{ top: "100%" }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="absolute left-0 right-0 h-1 bg-[#7c3aed] shadow-[0_0_15px_#7c3aed] z-10"
            />
          )}
        </Motion.button>
      </div>

      <div className="text-center">
        <h3 className="text-lg font-bold text-zinc-800">
          {isDone ? "Identity Verified" : isScanning ? "Scanning..." : "Touch to Verify"}
        </h3>
        <p className="text-zinc-400 text-xs mt-1">
          {isDone ? "Secure access granted" : "Hold your finger on the sensor"}
        </p>
      </div>
    </div>
  );
};

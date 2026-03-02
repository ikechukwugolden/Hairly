import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { auth, db } from '../../../firebaseconfig'; 
import { 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider 
} from 'firebase/auth';
import { doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { Loader2, Camera, ChevronLeft, CheckCircle2, Check, AlertCircle, X } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc'; 
import { FaFacebook, FaApple } from 'react-icons/fa';

export const SignupSteps = ({ onSwitchToLogin, onFinish }) => {
  const [subStep, setSubStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false); 
  const [imagePreview, setImagePreview] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'error' });
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    fullName: '', email: '', password: '', confirmPassword: '',
    businessName: '', address: '', location: '', phoneNumber: '',
    bio: '', specialties: [], salonType: ''
  });

  const services = ["Braids", "Wigs and installations", "Natural Hair", "Weaves and Extensions", "Lace", "Hair Treatment", "Bridal and occasional", "Kids"];
  const salonTypes = ["Salon", "Home Service", "Both"];

  const showMsg = (message, type = 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'error' }), 4000);
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const toggleService = (service) => {
    const updated = formData.specialties.includes(service)
      ? formData.specialties.filter(s => s !== service)
      : [...formData.specialties, service];
    setFormData({ ...formData, specialties: updated });
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const userDoc = await getDoc(doc(db, "users", user.uid));
      
      if (!userDoc.exists()) {
        await setDoc(doc(db, "users", user.uid), {
          fullName: user.displayName || '',
          email: user.email,
          role: 'stylist',
          setupComplete: false,
          createdAt: new Date().toISOString()
        });
        setSubStep(2);
      } else if (userDoc.data().setupComplete) {
        onFinish();
      } else {
        setSubStep(2);
      }
    } catch (error) {
      showMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSignUp = async () => {
    if (formData.password !== formData.confirmPassword) return showMsg("Passwords do not match");
    if (!formData.email || !formData.password) return showMsg("Please fill in all fields");
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      await setDoc(doc(db, "users", userCredential.user.uid), {
        fullName: formData.fullName,
        email: formData.email,
        role: 'stylist', 
        setupComplete: false, 
        createdAt: new Date().toISOString()
      });
      setSubStep(2);
    } catch (err) { 
        showMsg(err.message); 
    } finally { 
        setLoading(false); 
    }
  };

  const handleFinish = async () => {
    if (!formData.bio) return showMsg("Please write a short bio");
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("No user logged in");
      const { password, confirmPassword, ...profileData } = formData;

      await updateDoc(doc(db, "users", user.uid), {
        ...profileData,
        profileImage: imagePreview || "",
        setupComplete: true
      });
      
      setShowSuccess(true);
      setTimeout(() => { onFinish(); }, 1500);
    } catch (err) { 
      showMsg(err.message); 
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    if (showSuccess) {
      return (
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 size={64} className="text-green-500" />
          </div>
          <h2 className="text-3xl font-black text-[#7c3aed]">Success!</h2>
          <p className="text-zinc-500 mt-2 font-medium">Setting up your profile...</p>
        </motion.div>
      );
    }

    switch(subStep) {
      case 1: return (
        <motion.div key="step1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <div className="text-center md:text-left">
            <h2 className="text-2xl font-bold text-zinc-900">Create Account</h2>
            <p className="text-zinc-500 text-sm">Join the Hairly community today.</p>
          </div>
          <div className="space-y-3">
            <input name="fullName" onChange={handleChange} placeholder="Full Name" className="w-full bg-zinc-50 p-4 rounded-xl outline-none border border-zinc-200 focus:border-[#7c3aed] transition-all text-black" />
            <input name="email" onChange={handleChange} placeholder="Email" className="w-full bg-zinc-50 p-4 rounded-xl outline-none border border-zinc-200 focus:border-[#7c3aed] transition-all text-black" />
            <input name="password" type="password" onChange={handleChange} placeholder="Password" className="w-full bg-zinc-50 p-4 rounded-xl outline-none border border-zinc-200 focus:border-[#7c3aed] transition-all text-black" />
            <input name="confirmPassword" type="password" onChange={handleChange} placeholder="Confirm Password" className="w-full bg-zinc-50 p-4 rounded-xl outline-none border border-zinc-200 focus:border-[#7c3aed] transition-all text-black" />
          </div>
          <button disabled={loading} onClick={handleSignUp} className="w-full py-4 bg-[#7c3aed] text-white rounded-full font-bold shadow-lg shadow-purple-200 active:scale-[0.98] transition-all flex justify-center items-center">
            {loading ? <Loader2 className="animate-spin" /> : "Sign up"}
          </button>
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-200"></div></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-zinc-400 font-bold">Or continue with</span></div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleGoogleSignIn} disabled={loading} type="button" className="flex-1 flex items-center justify-center py-3 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors">
              <FcGoogle size={24} />
            </button>
            <button type="button" className="flex-1 flex items-center justify-center py-3 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors">
              <FaFacebook size={24} className="text-[#1877F2]" />
            </button>
            <button type="button" className="flex-1 flex items-center justify-center py-3 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors">
              <FaApple size={24} className="text-black" />
            </button>
          </div>
          <p className="text-center text-sm text-zinc-500 font-sans">Already have an account? <button onClick={onSwitchToLogin} className="text-[#7c3aed] font-bold hover:underline">Log in</button></p>
        </motion.div>
      );

      case 2: return (
        <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4 text-black">
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => setSubStep(1)}><ChevronLeft className="text-zinc-400" /></button>
            <h2 className="text-2xl font-bold text-zinc-900">Business Details</h2>
          </div>
          <div className="space-y-3">
            <input name="businessName" value={formData.businessName} onChange={handleChange} placeholder="Business Name" className="w-full bg-zinc-50 p-4 rounded-xl border border-zinc-200 outline-none focus:border-[#7c3aed]" />
            <input name="address" value={formData.address} onChange={handleChange} placeholder="Address" className="w-full bg-zinc-50 p-4 rounded-xl border border-zinc-200 outline-none focus:border-[#7c3aed]" />
            <input name="location" value={formData.location} onChange={handleChange} placeholder="City/State" className="w-full bg-zinc-50 p-4 rounded-xl border border-zinc-200 outline-none focus:border-[#7c3aed]" />
            <input name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} placeholder="Phone Number" className="w-full bg-zinc-50 p-4 rounded-xl border border-zinc-200 outline-none focus:border-[#7c3aed]" />
          </div>
          <button onClick={() => setSubStep(3)} className="w-full py-4 bg-[#7c3aed] text-white rounded-full font-bold mt-6 shadow-lg shadow-purple-200">Continue</button>
        </motion.div>
      );

      case 3: return (
        <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col text-black">
          <div className="flex items-center mb-6">
            <ChevronLeft onClick={() => setSubStep(2)} className="cursor-pointer text-zinc-400" />
            <h2 className="flex-1 text-center text-xl font-bold">Select Specialties</h2>
          </div>
          <div className="grid grid-cols-1 gap-2 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
            {services.map((service) => (
              <div key={service} onClick={() => toggleService(service)} className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${formData.specialties.includes(service) ? 'border-[#7c3aed] bg-purple-50' : 'border-zinc-100 bg-white'}`}>
                <span className={`font-medium ${formData.specialties.includes(service) ? 'text-[#7c3aed]' : 'text-zinc-600'}`}>{service}</span>
                <div className={`w-5 h-5 rounded flex items-center justify-center border-2 ${formData.specialties.includes(service) ? 'bg-[#7c3aed] border-[#7c3aed]' : 'border-zinc-200'}`}>
                  {formData.specialties.includes(service) && <Check size={14} className="text-white" />}
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => formData.specialties.length > 0 ? setSubStep(4) : showMsg("Please select at least one specialty")} className="w-full py-4 bg-[#7c3aed] text-white rounded-full font-bold mt-8 shadow-lg shadow-purple-200">Continue</button>
        </motion.div>
      );

      case 4: return (
        <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col text-black">
          <div className="flex items-center mb-8">
            <ChevronLeft onClick={() => setSubStep(3)} className="cursor-pointer text-zinc-400" />
            <h2 className="flex-1 text-center text-xl font-bold">Service Mode</h2>
          </div>
          <div className="space-y-4">
            {salonTypes.map((type) => (
              <div key={type} onClick={() => setFormData({...formData, salonType: type})} className={`flex items-center justify-between p-5 rounded-2xl border-2 cursor-pointer transition-all ${formData.salonType === type ? 'border-[#7c3aed] bg-purple-50' : 'border-zinc-100 bg-zinc-50'}`}>
                <span className="font-bold">{type}</span>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${formData.salonType === type ? 'border-[#7c3aed]' : 'border-zinc-300'}`}>
                  {formData.salonType === type && <div className="w-3 h-3 bg-[#7c3aed] rounded-full" />}
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => formData.salonType ? setSubStep(5) : showMsg("Please select a service mode")} className="w-full py-4 bg-[#7c3aed] text-white rounded-full font-bold mt-12 shadow-lg shadow-purple-200">Continue</button>
        </motion.div>
      );

      case 5: return (
        <motion.div key="step5" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4 text-black text-center">
          <div className="flex items-center mb-6">
            <ChevronLeft onClick={() => setSubStep(4)} className="cursor-pointer text-zinc-400" />
            <h2 className="flex-1 text-xl font-bold">Profile Photo</h2>
          </div>
          <div onClick={() => fileInputRef.current.click()} className="group relative w-48 h-48 mx-auto rounded-full bg-zinc-100 border-4 border-white shadow-2xl overflow-hidden flex items-center justify-center cursor-pointer">
            {imagePreview ? (
              <img src={imagePreview} className="w-full h-full object-cover" alt="preview" />
            ) : (
              <div className="text-center">
                <Camera size={48} className="text-zinc-300 mx-auto mb-2" />
                <p className="text-xs text-zinc-400 font-bold uppercase">Upload</p>
              </div>
            )}
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
               <Camera className="text-white" size={32} />
            </div>
          </div>
          <input type="file" ref={fileInputRef} hidden onChange={handleImageChange} accept="image/*" />
          <p className="text-zinc-400 text-sm mt-4 px-6 italic">A professional photo helps build trust with clients.</p>
          <button onClick={() => setSubStep(6)} className="w-full py-4 bg-[#7c3aed] text-white rounded-full font-bold mt-10 shadow-lg shadow-purple-200">Continue</button>
        </motion.div>
      );

      case 6: return (
        <motion.div key="step6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 text-black">
          <div className="flex items-center mb-2">
            <ChevronLeft onClick={() => setSubStep(5)} className="cursor-pointer text-zinc-400" />
            <h2 className="flex-1 text-2xl font-bold">Final Touch</h2>
          </div>
          <p className="text-zinc-500 text-sm">Tell your clients a bit about yourself and your passion.</p>
          <textarea name="bio" value={formData.bio} onChange={handleChange} placeholder="I specialize in natural hair care and goddess braids with over 5 years of experience..." className="w-full bg-zinc-50 p-5 rounded-2xl h-40 border border-zinc-200 outline-none focus:border-[#7c3aed] resize-none" />
          <button disabled={loading} onClick={handleFinish} className="w-full py-4 bg-[#7c3aed] text-white rounded-full font-bold mt-6 flex justify-center shadow-lg shadow-purple-200 transition-all active:scale-[0.98]">
            {loading ? <Loader2 className="animate-spin" /> : "Finish Setup"}
          </button>
        </motion.div>
      );
      
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col relative overflow-hidden">
      <AnimatePresence>
        {toast.show && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }} 
            animate={{ y: 20, opacity: 1 }} 
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[100] flex justify-center px-6 pointer-events-none"
          >
            <div className={`pointer-events-auto flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl border ${toast.type === 'error' ? 'bg-red-50 border-red-100 text-red-600' : 'bg-green-50 border-green-100 text-green-600'}`}>
              {toast.type === 'error' ? <AlertCircle size={18} /> : <Check size={18} />}
              <span className="text-sm font-bold">{toast.message}</span>
              <X size={16} className="ml-2 cursor-pointer opacity-50 hover:opacity-100" onClick={() => setToast({ ...toast, show: false })} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-md mx-auto px-6 py-12 flex-1 flex flex-col justify-center">
        <h1 className="text-4xl md:text-5xl font-black text-[#7c3aed] italic mb-10 text-center tracking-tighter">Hairly</h1>
        <div className="flex-1">
          <AnimatePresence mode="wait">{renderStep()}</AnimatePresence>
        </div>
      </div>
    </div>
  );
};
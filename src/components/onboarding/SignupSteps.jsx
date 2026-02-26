import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { auth, db } from '../../../firebaseconfig'; 
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { Loader2, Camera, ChevronLeft, Search, Check, CheckCircle2 } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc'; 
import { FaFacebook, FaApple } from 'react-icons/fa';

export const SignupSteps = ({ onSwitchToLogin, onFinish }) => {
  const [subStep, setSubStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false); 
  const [imagePreview, setImagePreview] = useState(null); // This holds the Base64 string
  const [searchTerm, setSearchTerm] = useState("");
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    fullName: '', email: '', password: '', confirmPassword: '',
    businessName: '', address: '', location: '', phoneNumber: '',
    bio: '', specialties: [], salonType: ''
  });

  const services = ["Braids", "Wigs and installations", "Natural Hair", "Weaves and Extensions", "Lace", "Hair Treatment", "Bridal and occasional", "Kids"];
  const salonTypes = ["Salon", "Home Service", "Both"];

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const toggleService = (service) => {
    const updated = formData.specialties.includes(service)
      ? formData.specialties.filter(s => s !== service)
      : [...formData.specialties, service];
    setFormData({ ...formData, specialties: updated });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Convert image to Base64 string to save in Firestore directly
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSignUp = async () => {
    if (formData.password !== formData.confirmPassword) return alert("Passwords do not match");
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
        alert(err.message); 
    } finally { 
        setLoading(false); 
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("No user logged in");

      // Cleanup: Remove passwords
      const { password, confirmPassword, ...profileData } = formData;

      // Update Firestore with business details and the image (as Base64 string)
      await updateDoc(doc(db, "users", user.uid), {
        ...profileData,
        profileImage: imagePreview || "", // Saving string directly to DB
        setupComplete: true
      });
      
      setShowSuccess(true);
      
      // Direct to dashboard
      setTimeout(() => {
        onFinish(); 
      }, 1500);

    } catch (err) { 
      alert(err.message); 
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
          <p className="text-zinc-500 mt-2 font-medium">Taking you to your home page...</p>
        </motion.div>
      );
    }

    switch(subStep) {
      case 1: return (
        <motion.div key="step1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <h2 className="text-2xl font-bold text-[#7c3aed]">Sign up</h2>
          <div className="space-y-3">
            <input name="fullName" onChange={handleChange} placeholder="Full Name" className="w-full bg-zinc-50 p-4 rounded-xl text-black outline-none border border-zinc-100" />
            <input name="email" onChange={handleChange} placeholder="Email" className="w-full bg-zinc-50 p-4 rounded-xl text-black outline-none border border-zinc-100" />
            <input name="password" type="password" onChange={handleChange} placeholder="Password" className="w-full bg-zinc-50 p-4 rounded-xl text-black outline-none border border-zinc-100" />
            <input name="confirmPassword" type="password" onChange={handleChange} placeholder="Confirm Password" className="w-full bg-zinc-50 p-4 rounded-xl text-black outline-none border border-zinc-100" />
          </div>
          <button disabled={loading} onClick={handleSignUp} className="w-full py-4 bg-[#7c3aed] text-white rounded-full font-bold mt-4 flex justify-center">
            {loading ? <Loader2 className="animate-spin" /> : "Sign up"}
          </button>
          <p className="text-center text-sm">Already have an account? <button onClick={onSwitchToLogin} className="text-[#7c3aed] font-bold">Log in</button></p>
        </motion.div>
      );

      case 2: return (
        <motion.div key="step2" className="space-y-4 text-black">
          <h2 className="text-2xl font-bold text-[#7c3aed]">Profile Setup</h2>
          <div className="space-y-3">
            <input name="businessName" onChange={handleChange} placeholder="Business Name" className="w-full bg-zinc-50 p-4 rounded-xl border" />
            <input name="address" onChange={handleChange} placeholder="Address" className="w-full bg-zinc-50 p-4 rounded-xl border" />
            <input name="location" onChange={handleChange} placeholder="Location" className="w-full bg-zinc-50 p-4 rounded-xl border" />
            <input name="phoneNumber" onChange={handleChange} placeholder="Phone Number" className="w-full bg-zinc-50 p-4 rounded-xl border" />
          </div>
          <button onClick={() => setSubStep(3)} className="w-full py-4 bg-[#7c3aed] text-white rounded-full font-bold mt-6">Continue</button>
        </motion.div>
      );

      case 3: return (
        <motion.div key="step3" className="flex flex-col text-black">
          <div className="flex items-center mb-4"><ChevronLeft onClick={() => setSubStep(2)} className="cursor-pointer" /><h2 className="flex-1 text-center font-bold">Services</h2></div>
          <div className="space-y-1 overflow-y-auto max-h-[350px]">
            {services.map((service) => (
              <div key={service} onClick={() => toggleService(service)} className="flex items-center justify-between p-4 border-b">
                <span>{service}</span>
                <div className={`w-5 h-5 rounded border-2 ${formData.specialties.includes(service) ? 'bg-[#7c3aed]' : ''}`} />
              </div>
            ))}
          </div>
          <button onClick={() => setSubStep(4)} className="w-full py-4 bg-[#7c3aed] text-white rounded-full font-bold mt-10">Continue</button>
        </motion.div>
      );

      case 4: return (
        <motion.div key="step4" className="flex flex-col text-black">
          <h2 className="text-center font-bold mb-8">Salon Type</h2>
          <div className="space-y-3">
            {salonTypes.map((type) => (
              <div key={type} onClick={() => setFormData({...formData, salonType: type})} className="flex items-center justify-between p-5 bg-zinc-50 rounded-2xl border">
                <span>{type}</span>
                <div className={`w-6 h-6 rounded-full border-2 ${formData.salonType === type ? 'border-[#7c3aed]' : ''}`} />
              </div>
            ))}
          </div>
          <button onClick={() => setSubStep(5)} className="w-full py-4 bg-[#7c3aed] text-white rounded-full font-bold mt-12">Continue</button>
        </motion.div>
      );

      case 5: return (
        <motion.div key="step5" className="space-y-4 text-black text-center">
          <div className="flex items-center mb-6"><ChevronLeft onClick={() => setSubStep(4)} /><h2 className="flex-1 text-xl font-bold">Add Photo</h2></div>
          <div onClick={() => fileInputRef.current.click()} className="w-56 h-56 mx-auto rounded-full bg-zinc-50 border-4 border-white shadow-xl overflow-hidden flex items-center justify-center cursor-pointer">
            {imagePreview ? <img src={imagePreview} className="w-full h-full object-cover" /> : <Camera size={48} className="text-zinc-200" />}
          </div>
          <input type="file" ref={fileInputRef} hidden onChange={handleImageChange} accept="image/*" />
          <button onClick={() => setSubStep(6)} className="w-full py-4 bg-[#7c3aed] text-white rounded-full font-bold mt-10">Continue</button>
        </motion.div>
      );

      case 6: return (
        <motion.div key="step6" className="space-y-4 text-black">
          <div className="flex items-center mb-2"><ChevronLeft onClick={() => setSubStep(5)} /><h2 className="flex-1 text-2xl font-bold">Bio</h2></div>
          <textarea name="bio" onChange={handleChange} placeholder="Write a short bio..." className="w-full bg-zinc-50 p-5 rounded-2xl h-40 border outline-none resize-none" />
          <button disabled={loading} onClick={handleFinish} className="w-full py-4 bg-[#7c3aed] text-white rounded-full font-bold mt-6 flex justify-center">
            {loading ? <Loader2 className="animate-spin" /> : "Finish Setup"}
          </button>
        </motion.div>
      );
      
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-white p-8 pt-12">
        <div className="max-w-md mx-auto">
          <h1 className="text-5xl font-black text-[#7c3aed] italic mb-12 text-center">Hairly</h1>
          <AnimatePresence mode="wait">{renderStep()}</AnimatePresence>
        </div>
    </div>
  );
};
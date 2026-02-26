import React, { useState, useEffect } from 'react';
import {
  ChevronRight, Edit3, MessageSquare, Bell, Settings, LogOut,
  MapPin, Phone, Folder
} from 'lucide-react';
import { auth, db } from '../../firebaseconfig';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) setUserData(userDoc.data());
        } catch (error) {
          console.error("Profile Load Error:", error);
        } finally {
          setLoading(false);
        }
      } else {
        // If no user, the ProtectedRoute in App.jsx usually handles this, 
        // but this is a safe fallback.
        navigate('/'); 
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // App.jsx will detect this change and show the LandingHero
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  const menu = [
    { icon: <Edit3 size={18} />, label: "Edit Profile", path: "/edit-profile" }, // Fixed path to match App.jsx
    { icon: <MessageSquare size={18} />, label: "Reviews", path: "/reviews" },
    { icon: <Bell size={18} />, label: "Notifications", path: "/notifications" },
    { icon: <Folder size={18} />, label: "My Styles", path: "/portfolio" },
    { icon: <Settings size={18} />, label: "Settings", path: "/settings" },
    {
      icon: <LogOut size={18} />,
      label: "Log out",
      color: "text-red-500",
      action: handleLogout
    }
  ];

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-8 h-8 border-4 border-[#7c3aed] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white pb-24"> {/* Added padding for global Nav */}
      {/* HEADER SECTION */}
      <div className="bg-[#d8c5fb] p-8 pt-16 rounded-b-[40px] text-zinc-800">
        <div className="flex flex-col items-start gap-4">
          <div className="flex gap-4 items-center">
            <div className="w-20 h-20 rounded-full border-4 border-white overflow-hidden shadow-lg bg-zinc-100">
              <img
                src={userData?.profileImage || `https://ui-avatars.com/api/?name=${userData?.fullName || 'User'}&background=7c3aed&color=fff`}
                className="w-full h-full object-cover"
                alt="Profile"
              />
            </div>
            <div>
              <h2 className="font-bold text-xl">{userData?.businessName || userData?.fullName || 'Stylist Name'}</h2>
              <p className="text-sm opacity-80 flex items-center gap-1"><MapPin size={12} /> {userData?.address || 'Location not set'}</p>
              <p className="text-sm opacity-80 flex items-center gap-1"><Phone size={12} /> {userData?.phoneNumber || 'No phone'}</p>
            </div>
          </div>

          <div className="mt-2">
            <p className="text-xs leading-relaxed font-medium text-zinc-600">
              {userData?.bio || "No bio added yet."}
            </p>
          </div>
        </div>
      </div>

      {/* SPECIALTIES SECTION */}
      <div className="px-6 py-4 bg-[#e9dffc]">
        <div className="space-y-3">
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-[#7c3aed]">Specialties</h4>
            <p className="text-xs font-bold text-zinc-700">{userData?.specialties || "Not specified"}</p>
          </div>
          <div className="flex justify-between">
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-[#7c3aed]">Services</h4>
              <p className="text-xs font-bold text-zinc-700">{userData?.serviceType || "Not specified"}</p>
            </div>
            <div className="text-right">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-[#7c3aed]">Working Hours</h4>
              <p className="text-xs font-bold text-zinc-700">{userData?.workingHours || "Not set"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* MENU LIST */}
      <div className="p-6">
        <div className="space-y-3">
          {menu.map((item, i) => (
            <button
              key={i}
              type="button"
              onClick={item.action || (() => navigate(item.path))}
              className="w-full flex items-center justify-between p-4 bg-white border border-zinc-100 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
            >
              <div className={`flex items-center gap-4 ${item.color || 'text-zinc-700'}`}>
                <div className="p-2 bg-zinc-50 rounded-xl">{item.icon}</div>
                <span className="text-sm font-bold">{item.label}</span>
              </div>
              <ChevronRight size={18} className="text-zinc-300" />
            </button>
          ))}
        </div>
      </div>
      
      {/* NOTE: No <nav> here! It is already in App.jsx */}
    </div>
  );
}
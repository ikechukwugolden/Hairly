import React, { useState, useEffect } from 'react';
import { Search, Bell, Star, Loader2, Calendar, Users, Home as HomeIcon, Briefcase, User } from 'lucide-react';
import { auth, db } from '../../firebaseconfig';
import { doc, getDoc, collection, query, limit, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useNavigate, useLocation } from 'react-router-dom'; // Added useLocation for active states
import hero from '../assets/pick.jpg'; // Example local asset, replace with your own

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation(); // Used to highlight the current page
  const [userData, setUserData] = useState(null);
  const [featuredStyles, setFeaturedStyles] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) setUserData(userDoc.data());

          const stylesSnapshot = await getDocs(query(collection(db, "styles"), limit(5)));
          const stylesData = stylesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setFeaturedStyles(stylesData.length > 0 ? stylesData : [
            { id: 'p1', image: 'https://azureglam.com/wp-content/uploads/2024/01/6-52.jpg', name: 'Goddess Braids' },
            { id: 'p2', image: 'https://cdn.shopify.com/s/files/1/0515/2800/7870/files/Braided_Crown_5750c077-9a09-4ba1-bcb5-ae10d1fd40b1.jpg?v=1749439083', name: 'Braided Crown' },
            { id: 'p3', image: 'https://images.unsplash.com/photo-1632765854612-9b02b6ec2b15?w=400', name: 'Sleek Pony' },
            { id: 'p4', image: hero, name: 'Signature Style' }, // Correctly uses the local import
            { id: 'p5', image: 'https://lyntrico.com/wp-content/uploads/2025/12/2-43.webp', name: 'Fulani Braids' },
            { id: 'p6', image: 'https://lyntrico.com/wp-content/uploads/2025/12/3-42.webp', name: 'Soft Locs' }
          ]);
          setUpcomingAppointments([
            { id: 1, name: 'Ada Okorie', time: 'Morning', status: 'Confirmed' },
            { id: 2, name: 'Ada Okorie', time: 'Afternoon', status: 'Pending' },
            { id: 3, name: 'Ada Okorie', time: 'Morning', status: 'Confirmed' },
          ]);
        } catch (error) {
          console.error("Home Load Error:", error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Helper function to color the active icon
  const getNavClass = (path) =>
    `flex flex-col items-center gap-1 flex-1 transition-all ${location.pathname === path ? 'text-[#7c3aed]' : 'text-zinc-400'}`;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <Loader2 className="animate-spin text-[#7c3aed]" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fcfcfc] pb-32 font-sans overflow-x-hidden">

      {/* HEADER SECTION */}
      <div className="bg-[#7c3aed] p-6 pt-12 rounded-b-[40px] shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between mb-6 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl border-2 border-white/30 overflow-hidden bg-white/10">
              <img
                src={userData?.profileImage || `https://ui-avatars.com/api/?name=${userData?.fullName || 'User'}&background=fff&color=7c3aed`}
                className="w-full h-full object-cover"
                alt="profile"
              />
            </div>
            <div className="text-white">
              <h1 className="font-bold text-base leading-tight">
                {userData?.businessName || userData?.fullName || 'Chi-Beauty Hub'}
              </h1>
              <div className="flex items-center gap-1 text-xs opacity-90">
                <span>{userData?.rating || '4.8'}</span>
                <Star size={10} fill="white" className="text-white" />
              </div>
            </div>
          </div>
          <div className="relative">
            <Bell className="text-white" size={24} />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border-2 border-[#7c3aed] rounded-full"></span>
          </div>
        </div>

        {/* STATS ROW */}
        <div className="flex justify-between gap-2 mb-2 relative z-10">
          {[
            { label: 'Clients', val: userData?.clientCount || '0', icon: <Briefcase size={16} /> },
            { label: 'Followers', val: userData?.followersCount || '0', icon: <Users size={16} /> },
            { label: 'Upcoming', val: '', icon: <Calendar size={16} /> }
          ].map((stat, i) => (
            <div key={i} className="flex-1 bg-white/20 backdrop-blur-md rounded-2xl p-2 text-center text-white border border-white/10 min-w-0">
              <div className="flex justify-center mb-1">{stat.icon}</div>
              <p className="font-black text-sm leading-none truncate">{stat.val}</p>
              <p className="text-[9px] opacity-80 uppercase tracking-tighter truncate">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="px-6 -mt-6 relative z-20">
        <div className="relative shadow-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input
            type="text"
            placeholder="Find a style or hairstyle inspiration"
            className="w-full bg-white p-4 pl-12 rounded-2xl text-sm outline-none border-none shadow-sm placeholder:text-zinc-400"
          />
        </div>
      </div>

      {/* FEATURED STYLES */}
      <div className="mt-8 px-6">
        <h2 className="font-bold text-zinc-800 text-base mb-4">Featured styles</h2>
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
          {featuredStyles.map((style) => (
            <div key={style.id} className="min-w-[120px] h-[120px] rounded-2xl overflow-hidden bg-zinc-200 flex-shrink-0">
              <img src={style.image} className="w-full h-full object-cover" alt="style" />
            </div>
          ))}
        </div>
      </div>

      {/* UPCOMING APPOINTMENTS */}
      <div className="mt-8 px-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-zinc-800 text-base">Upcoming</h2>
          <button className="text-xs font-semibold text-zinc-400">See all</button>
        </div>
        <div className="space-y-3">
          {upcomingAppointments.map((apt, index) => (
            <div key={index} className="bg-white p-4 rounded-2xl border border-zinc-100 flex justify-between items-center shadow-sm">
              <div className="min-w-0">
                <h3 className="font-bold text-zinc-800 text-sm truncate">{apt.name}</h3>
                <p className="text-zinc-400 text-[11px] mt-0.5">Today • {apt.time}</p>
              </div>
              <span className={`text-[10px] font-bold px-3 py-1 rounded-full flex-shrink-0 ${apt.status === 'Confirmed' ? 'text-emerald-500 bg-emerald-50' : 'text-red-400 bg-red-50'}`}>
                {apt.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* NAV BAR FIX */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-100 pt-3 pb-8 z-50">
        <div className="flex justify-around items-center px-4 max-w-md mx-auto">

          <button onClick={() => navigate('/Home')} className={getNavClass('/Home')}>
            <HomeIcon size={24} />
            <span className="text-[10px] font-bold">Home</span>
          </button>

          <button onClick={() => navigate('/explore')} className={getNavClass('/Explore')}>
            <Users size={24} />
            <span className="text-[10px] font-medium">Explore</span>
          </button>

          {/* Calendar tab aligned with others */}
          <button onClick={() => navigate('/calendar')} className={getNavClass('/calendar')}>
            <Calendar size={24} />
            <span className="text-[10px] font-medium">Calendar</span>
          </button>

          <button onClick={() => navigate('/portfolio')} className={getNavClass('/portfolio')}>
            <Briefcase size={24} />
            <span className="text-[10px] font-medium">Portfolio</span>
          </button>

          <button onClick={() => navigate('/profile')} className={getNavClass('/profile')}>
            <User size={24} />
            <span className="text-[10px] font-medium">Profile</span>
          </button>

        </div>
      </nav>
    </div>
  );
}
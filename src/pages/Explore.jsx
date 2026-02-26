import { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, MapPin, Star, Loader2, Users } from 'lucide-react';
import { db, auth } from '../../firebaseconfig';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

export default function Explore() {
  const [stylists, setStylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("Top Rated");
  const [searchQuery, setSearchQuery] = useState("");
  const [userLocation, setUserLocation] = useState("");

  const filters = ["Top Rated", "Near me", "Braids", "Home Service", "Available now", "Natural Hair"];

  useEffect(() => {
    const fetchStylists = async () => {
      setLoading(true);
      try {
        // 1. Get current user's location for the "Near me" filter
        if (!userLocation && auth.currentUser) {
          const userDoc = await getDocs(query(collection(db, "users"), where("uid", "==", auth.currentUser.uid)));
          if (!userDoc.empty) {
            setUserLocation(userDoc.docs[0].data().location);
          }
        }

        let q;
        const usersRef = collection(db, "users");

        // 2. Build Automatic Query based on Active Filter
        if (activeFilter === "Near me" && userLocation) {
          q = query(usersRef, where("role", "==", "stylist"), where("location", "==", userLocation));
        } else if (activeFilter === "Top Rated") {
          q = query(usersRef, where("role", "==", "stylist"), orderBy("rating", "desc"), limit(15));
        } else if (activeFilter === "Home Service") {
          q = query(usersRef, where("role", "==", "stylist"), where("serviceType", "==", "Home Service"));
        } else {
          // Default: Fetch all stylists
          q = query(usersRef, where("role", "==", "stylist"), limit(20));
        }

        const querySnapshot = await getDocs(q);
        const fetchedStylists = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setStylists(fetchedStylists);
      } catch (error) {
        console.error("Error fetching stylists:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStylists();
  }, [activeFilter, userLocation]);

  // Local Search Filtering
  const displayedStylists = stylists.filter(s => 
    (s.businessName || s.fullName || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header & Filters */}
      <div className="bg-[#7c3aed] p-6 pt-12 rounded-b-[40px] shadow-lg">
        <div className="flex items-center gap-2 bg-white rounded-2xl px-4 py-3 shadow-inner">
          <Search size={18} className="text-zinc-400" />
          <input 
            type="text" 
            placeholder="Search by name or style..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 outline-none text-sm p-1" 
          />
          <SlidersHorizontal size={18} className="text-zinc-400" />
        </div>
        
        <div className="flex gap-2 mt-6 overflow-x-auto no-scrollbar pb-2">
          {filters.map(f => (
            <button 
              key={f} 
              onClick={() => setActiveFilter(f)}
              className={`whitespace-nowrap px-5 py-2 rounded-full border text-[10px] font-bold transition-all ${
                activeFilter === f 
                ? 'bg-white text-[#7c3aed] border-white shadow-md scale-105' 
                : 'bg-white/10 border-white/20 text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Stylist List */}
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-black text-zinc-800 text-lg uppercase tracking-tight">
            {activeFilter} Stylists
          </h2>
          <span className="text-[10px] font-bold text-zinc-400">{displayedStylists.length} Found</span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-20">
            <Loader2 className="animate-spin text-[#7c3aed] mb-2" size={30} />
            <p className="text-xs font-bold uppercase tracking-widest">Searching Cloud...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedStylists.length > 0 ? displayedStylists.map((s) => (
              <div key={s.id} className="flex gap-4 p-4 rounded-[28px] border border-zinc-50 shadow-sm bg-white hover:border-[#7c3aed]/20 transition-all active:scale-[0.98]">
                <div className="w-16 h-16 bg-zinc-100 rounded-full overflow-hidden border-2 border-zinc-50 flex-shrink-0">
                  <img 
                    src={s.profileImage || `https://ui-avatars.com/api/?name=${s.businessName || s.fullName}&background=random`} 
                    alt="stylist" 
                    className="w-full h-full object-cover" 
                  />
                </div>
                
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-sm text-zinc-800 line-clamp-1">{s.businessName || s.fullName}</h3>
                    <div className="flex items-center gap-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${s.status === 'Closed' ? 'bg-red-500' : 'bg-green-500'}`}></div>
                      <span className={`text-[9px] font-black uppercase ${s.status === 'Closed' ? 'text-red-500' : 'text-green-500'}`}>
                        {s.status || 'Open'}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-zinc-400 text-[10px] flex items-center gap-1 mt-1 font-medium">
                    <MapPin size={10} className="text-[#7c3aed]" /> {s.location || s.address || "Location Hidden"}
                  </p>
                  
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-3">
                      <span className="bg-amber-50 text-[#FBBF24] px-2 py-0.5 rounded-md text-[10px] font-black flex items-center gap-1">
                        <Star size={10} fill="#FBBF24" /> {s.rating || '5.0'}
                      </span>
                      <span className="text-zinc-300 text-[10px] font-bold">{s.followersCount || '0'} followers</span>
                    </div>
                    <button className="bg-[#7c3aed]/10 text-[#7c3aed] text-[9px] font-black px-3 py-1.5 rounded-xl uppercase hover:bg-[#7c3aed] hover:text-white transition-colors">
                      Book Now
                    </button>
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-20 flex flex-col items-center grayscale opacity-50">
                <Users size={48} className="text-zinc-200 mb-4" />
                <p className="text-zinc-500 text-sm font-bold">No stylists found for this filter.</p>
                <p className="text-zinc-400 text-[10px]">Try selecting "Top Rated" to see more.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
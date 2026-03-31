import { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, MapPin, Star, Loader2, Users } from 'lucide-react';
import { db, auth } from '../../firebaseconfig';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';

function toMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  return 0;
}

function buildReviewStats(rows) {
  const map = {};
  rows.forEach((row) => {
    const stylistId = row?.stylistId;
    if (!stylistId) return;
    const rating = Number(row?.rating);
    if (!Number.isFinite(rating)) return;
    if (!map[stylistId]) map[stylistId] = { sum: 0, count: 0 };
    map[stylistId].sum += rating;
    map[stylistId].count += 1;
  });
  Object.keys(map).forEach((stylistId) => {
    const entry = map[stylistId];
    map[stylistId] = {
      average: entry.count > 0 ? entry.sum / entry.count : 0,
      count: entry.count,
    };
  });
  return map;
}

export default function Explore() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('Top Rated');
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState('');
  const [viewerRole, setViewerRole] = useState('client');

  const clientFilters = ['All Clients', 'Pending', 'Confirmed', 'Declined'];
  const stylistFilters = ['Top Rated', 'Near me', 'Braids', 'Home Service', 'Available now', 'Natural Hair'];
  const filters = viewerRole === 'stylist' ? clientFilters : stylistFilters;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const user = auth.currentUser;
        const userDoc = user ? await getDoc(doc(db, 'users', user.uid)) : null;
        const profile = userDoc?.exists() ? userDoc.data() : null;
        const role = profile?.role || 'client';
        setViewerRole(role);

        if (role === 'stylist' && user) {
          const appointmentsSnapshot = await getDocs(
            query(collection(db, 'appointments'), where('stylistId', '==', user.uid))
          );

          const grouped = new Map();
          appointmentsSnapshot.docs.forEach((docSnap) => {
            const row = docSnap.data();
            const key = row.customerId || row.customerEmail || row.clientName || row.customerName || docSnap.id;
            const current = grouped.get(key) || {
              id: key,
              customerId: row.customerId || null,
              fullName: row.customerName || row.clientName || 'Client',
              profileImage: row.customerImage || row.clientImage || '',
              location: row.location || '',
              bookingCount: 0,
              latestStatus: 'pending',
              latestService: row.service || 'Hair Appointment',
              latestAt: 0,
            };

            const rowTime = toMillis(row.createdAt) || new Date(`${row.date || ''}T${row.time || '00:00'}`).getTime() || 0;
            current.bookingCount += 1;
            if (rowTime >= current.latestAt) {
              current.latestAt = rowTime;
              current.latestStatus = row.status || 'pending';
              current.latestService = row.service || 'Hair Appointment';
              current.fullName = row.customerName || row.clientName || current.fullName;
              current.profileImage = row.customerImage || row.clientImage || current.profileImage;
              current.location = row.location || current.location;
            }
            grouped.set(key, current);
          });

          const hydrated = await Promise.all(
            Array.from(grouped.values()).map(async (entry) => {
              if (!entry.customerId) return entry;
              try {
                const customerDoc = await getDoc(doc(db, 'users', entry.customerId));
                if (!customerDoc.exists()) return entry;
                const customer = customerDoc.data();
                return {
                  ...entry,
                  fullName: customer.fullName || customer.businessName || entry.fullName,
                  profileImage: customer.profileImage || entry.profileImage,
                  location: customer.location || customer.address || entry.location,
                  isActive: customer.isActive === true,
                };
              } catch {
                return entry;
              }
            })
          );

          hydrated.sort((a, b) => (b.latestAt || 0) - (a.latestAt || 0));
          setItems(hydrated);
          setLoading(false);
          return;
        }

        if (!userLocation && profile) {
          setUserLocation(profile.location || '');
        }

        let q;
        const usersRef = collection(db, 'users');

        if (activeFilter === 'Near me' && userLocation) {
          q = query(usersRef, where('role', '==', 'stylist'), where('location', '==', userLocation));
        } else if (activeFilter === 'Top Rated') {
          q = query(usersRef, where('role', '==', 'stylist'), orderBy('rating', 'desc'), limit(15));
        } else if (activeFilter === 'Home Service') {
          q = query(usersRef, where('role', '==', 'stylist'), where('serviceType', '==', 'Home Service'));
        } else {
          q = query(usersRef, where('role', '==', 'stylist'), limit(20));
        }

        const querySnapshot = await getDocs(q);
        const fetchedStylists = querySnapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));

        const reviewsSnapshot = await getDocs(collection(db, 'reviews'));
        const reviewRows = reviewsSnapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
        const reviewMap = buildReviewStats(reviewRows);

        const withRatings = fetchedStylists.map((stylist) => {
          const live = reviewMap[stylist.id];
          return {
            ...stylist,
            rating: live ? Number(live.average.toFixed(1)) : Number(stylist.rating || 0),
            reviewCount: live ? live.count : Number(stylist.reviewCount || 0),
          };
        });

        if (activeFilter === 'Top Rated') {
          withRatings.sort((a, b) => {
            const byRating = (Number(b.rating) || 0) - (Number(a.rating) || 0);
            if (byRating !== 0) return byRating;
            return (Number(b.reviewCount) || 0) - (Number(a.reviewCount) || 0);
          });
        }

        setItems(withRatings);
      } catch (error) {
        console.error('Error fetching explore data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeFilter, userLocation, viewerRole]);

  const filteredItems = items
    .filter((entry) => (entry.businessName || entry.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()));

  const displayedItems = viewerRole === 'stylist'
    ? filteredItems.filter((entry) => {
      if (activeFilter === 'All Clients') return true;
      return String(entry.latestStatus || '').toLowerCase() === activeFilter.toLowerCase();
    })
    : filteredItems;

  return (
    <div className="min-h-screen bg-white pb-24">
      <div className="bg-[#7c3aed] p-6 pt-12 rounded-b-[40px] shadow-lg">
        <div className="flex items-center gap-2 bg-white rounded-2xl px-4 py-3 shadow-inner">
          <Search size={18} className="text-zinc-400" />
          <input
            type="text"
            placeholder={viewerRole === 'stylist' ? 'Search clients...' : 'Search by name or style...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 outline-none text-sm p-1"
          />
          <SlidersHorizontal size={18} className="text-zinc-400" />
        </div>

        <div className="flex gap-2 mt-6 overflow-x-auto no-scrollbar pb-2">
          {filters.map((f) => (
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

      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-black text-zinc-800 text-lg uppercase tracking-tight">
            {viewerRole === 'stylist' ? 'Clients' : `${activeFilter} Stylists`}
          </h2>
          <span className="text-[10px] font-bold text-zinc-400">{displayedItems.length} Found</span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-20">
            <Loader2 className="animate-spin text-[#7c3aed] mb-2" size={30} />
            <p className="text-xs font-bold uppercase tracking-widest">Searching Cloud...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedItems.length > 0 ? displayedItems.map((entry) => {
              const card = (
                <div className="flex gap-4 p-4 rounded-[28px] border border-zinc-50 shadow-sm bg-white group-hover:border-[#7c3aed]/20 transition-all group-active:scale-[0.98]">
                  <div className="w-16 h-16 bg-zinc-100 rounded-full overflow-hidden border-2 border-zinc-50 flex-shrink-0">
                    <img
                      src={entry.profileImage || `https://ui-avatars.com/api/?name=${entry.businessName || entry.fullName || 'User'}&background=random`}
                      alt="person"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-sm text-zinc-800 line-clamp-1">{entry.businessName || entry.fullName}</h3>
                      <div className="flex items-center gap-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${entry.isActive ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                        <span className={`text-[9px] font-black uppercase ${entry.isActive ? 'text-emerald-600' : 'text-zinc-400'}`}>
                          {entry.isActive ? 'Active' : 'Offline'}
                        </span>
                      </div>
                    </div>

                    <p className="text-zinc-400 text-[10px] flex items-center gap-1 mt-1 font-medium">
                      <MapPin size={10} className="text-[#7c3aed]" /> {entry.location || 'Location Hidden'}
                    </p>

                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-3">
                        {viewerRole === 'stylist' ? (
                          <>
                            <span className="bg-violet-50 text-[#7c3aed] px-2 py-0.5 rounded-md text-[10px] font-black">
                              {entry.bookingCount || 0} bookings
                            </span>
                            <span className={`text-[10px] font-black ${String(entry.latestStatus || '').toLowerCase() === 'confirmed' ? 'text-emerald-600' : String(entry.latestStatus || '').toLowerCase() === 'declined' ? 'text-red-500' : 'text-amber-600'}`}>
                              {entry.latestStatus || 'pending'}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="bg-amber-50 text-[#FBBF24] px-2 py-0.5 rounded-md text-[10px] font-black flex items-center gap-1">
                              <Star size={10} fill="#FBBF24" /> {(Number(entry.rating) || 0).toFixed(1)}
                            </span>
                            <span className="text-zinc-300 text-[10px] font-bold">{entry.reviewCount || 0} reviews</span>
                            <span className={`text-[10px] font-black ${entry.acceptingBookings === false ? 'text-red-500' : 'text-emerald-600'}`}>
                              {entry.acceptingBookings === false
                                ? 'Unavailable'
                                : `${Math.max(1, Number(entry.bookingLimitPerDay) || 10)}/day`}
                            </span>
                          </>
                        )}
                      </div>

                      <div className="bg-[#7c3aed]/10 text-[#7c3aed] text-[9px] font-black px-3 py-1.5 rounded-xl uppercase group-hover:bg-[#7c3aed] group-hover:text-white transition-colors">
                        {viewerRole === 'stylist' ? 'Client' : 'View Profile'}
                      </div>
                    </div>
                  </div>
                </div>
              );

              if (viewerRole === 'stylist') {
                return <div key={entry.id} className="block group">{card}</div>;
              }

              return (
                <Link to={`/explore/${entry.id}`} key={entry.id} className="block group">
                  {card}
                </Link>
              );
            }) : (
              <div className="text-center py-20 flex flex-col items-center grayscale opacity-50">
                <Users size={48} className="text-zinc-200 mb-4" />
                <p className="text-zinc-500 text-sm font-bold">No {viewerRole === 'stylist' ? 'clients' : 'stylists'} found.</p>
                <p className="text-zinc-400 text-[10px]">Try another filter or check again later.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

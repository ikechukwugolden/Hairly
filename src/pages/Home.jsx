import { useEffect, useMemo, useState } from 'react';
import { Bell, CalendarDays, Loader2, Search, Star, Users } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../firebaseconfig';

function toMillis(value) {
  if (!value) return 0;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value?.seconds === 'number') return value.seconds * 1000;
  return 0;
}

function toDate(value) {
  if (!value) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  if (typeof value?.toDate === 'function') {
    const date = value.toDate();
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

function getAppointmentDate(appointment) {
  return (
    toDate(appointment?.appointmentDate) ||
    toDate(appointment?.scheduledAt) ||
    toDate(appointment?.dateTime) ||
    toDate(appointment?.date) ||
    null
  );
}

function isActiveBooking(status) {
  const normalized = String(status || '').toLowerCase();
  return normalized !== 'declined' && normalized !== 'cancelled' && normalized !== 'canceled';
}

function isSameLocalDay(first, second) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function getPeriodLabel(appointment) {
  const timeText = String(appointment?.time || '').trim();

  if (/morning/i.test(timeText)) return 'Morning';
  if (/afternoon/i.test(timeText)) return 'Afternoon';
  if (/evening/i.test(timeText)) return 'Evening';
  if (timeText) return timeText;

  const date = getAppointmentDate(appointment);
  const hours = date?.getHours();
  if (!Number.isFinite(hours)) return 'Scheduled';
  if (hours < 12) return 'Morning';
  if (hours < 17) return 'Afternoon';
  return 'Evening';
}

function getDayLabel(appointment) {
  const date = getAppointmentDate(appointment);
  if (!date) return 'Upcoming';

  const today = new Date();
  if (isSameLocalDay(date, today)) return 'Today';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function getStatusLabel(status) {
  const normalized = String(status || 'pending').toLowerCase();
  if (normalized === 'confirmed') return 'Confirmed';
  if (normalized === 'declined' || normalized === 'cancelled' || normalized === 'canceled') {
    return 'Cancelled';
  }
  return 'Pending';
}

function getStatusClasses(status) {
  const normalized = String(status || 'pending').toLowerCase();
  if (normalized === 'confirmed') return 'text-emerald-500';
  if (normalized === 'declined' || normalized === 'cancelled' || normalized === 'canceled') {
    return 'text-red-500';
  }
  return 'text-amber-500';
}

function mergeUniqueById(rows) {
  const map = new Map();
  rows.forEach((row) => {
    if (!row?.id) return;
    map.set(row.id, row);
  });
  return Array.from(map.values());
}

export default function Home() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [featuredStyles, setFeaturedStyles] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeAppointments = () => {};
    let unsubscribeFollowers = () => {};
    let unsubscribeNotifications = () => {};
    let unsubscribeOwnedStyles = () => {};
    let unsubscribeLegacyStyles = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      unsubscribeAppointments();
      unsubscribeFollowers();
      unsubscribeNotifications();
      unsubscribeOwnedStyles();
      unsubscribeLegacyStyles();

      if (!user) {
        setUserData(null);
        setFeaturedStyles([]);
        setAppointments([]);
        setFollowersCount(0);
        setUnreadCount(0);
        setLoading(false);
        navigate('/');
        return;
      }

      setLoading(true);

      try {
        const profileSnapshot = await getDoc(doc(db, 'users', user.uid));
        const profile = profileSnapshot.exists() ? profileSnapshot.data() : null;
        setUserData(profile);

        const appointmentsQuery = query(collection(db, 'appointments'), where('stylistId', '==', user.uid));
        unsubscribeAppointments = onSnapshot(
          appointmentsQuery,
          (snapshot) => {
            const rows = snapshot.docs.map((docSnapshot) => ({
              id: docSnapshot.id,
              ...docSnapshot.data(),
            }));
            setAppointments(rows);
          },
          () => setAppointments([])
        );

        const followersQuery = query(collection(db, 'follows'), where('stylistId', '==', user.uid));
        unsubscribeFollowers = onSnapshot(
          followersQuery,
          (snapshot) => setFollowersCount(snapshot.size),
          () => setFollowersCount(0)
        );

        const notificationsQuery = query(collection(db, 'notifications'), where('userId', '==', user.uid));
        unsubscribeNotifications = onSnapshot(
          notificationsQuery,
          (snapshot) => {
            const totalUnread = snapshot.docs.reduce((count, docSnapshot) => {
              return docSnapshot.data()?.read === true ? count : count + 1;
            }, 0);
            setUnreadCount(totalUnread);
          },
          () => setUnreadCount(0)
        );

        let ownedStyles = [];
        let legacyStyles = [];

        const pushMergedStyles = () => {
          const merged = mergeUniqueById([...ownedStyles, ...legacyStyles])
            .sort(
              (first, second) =>
                (toMillis(second.sharedAt) || toMillis(second.createdAt)) -
                (toMillis(first.sharedAt) || toMillis(first.createdAt))
            )
            .slice(0, 8);
          setFeaturedStyles(merged);
        };

        const ownedStylesQuery = query(collection(db, 'styles'), where('ownerId', '==', user.uid));
        unsubscribeOwnedStyles = onSnapshot(
          ownedStylesQuery,
          (snapshot) => {
            ownedStyles = snapshot.docs.map((docSnapshot) => ({
              id: docSnapshot.id,
              ...docSnapshot.data(),
            }));
            pushMergedStyles();
          },
          () => {
            ownedStyles = [];
            pushMergedStyles();
          }
        );

        const legacyStylesQuery = query(collection(db, 'styles'), where('stylistId', '==', user.uid));
        unsubscribeLegacyStyles = onSnapshot(
          legacyStylesQuery,
          (snapshot) => {
            legacyStyles = snapshot.docs.map((docSnapshot) => ({
              id: docSnapshot.id,
              ...docSnapshot.data(),
            }));
            pushMergedStyles();
          },
          () => {
            legacyStyles = [];
            pushMergedStyles();
          }
        );
      } catch (error) {
        console.error('Home load error:', error);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAppointments();
      unsubscribeFollowers();
      unsubscribeNotifications();
      unsubscribeOwnedStyles();
      unsubscribeLegacyStyles();
      unsubscribeAuth();
    };
  }, [navigate]);

  const displayName =
    userData?.businessName ||
    userData?.fullName ||
    auth.currentUser?.displayName ||
    'Beauty Hub';

  const profileImage =
    userData?.profileImage ||
    auth.currentUser?.photoURL ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=f4f4f5&color=7c3aed`;

  const ratingLabel = Number.isFinite(Number(userData?.rating))
    ? Number(userData.rating).toFixed(1)
    : '4.8';

  const uniqueClientsCount = useMemo(() => {
    return new Set(
      appointments
        .map((appointment) => {
          return (
            appointment?.clientId ||
            appointment?.customerId ||
            appointment?.clientEmail ||
            appointment?.customerEmail ||
            appointment?.clientName ||
            appointment?.customerName ||
            null
          );
        })
        .filter(Boolean)
    ).size;
  }, [appointments]);

  const activeUpcomingAppointments = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    return appointments
      .filter((appointment) => {
        if (!isActiveBooking(appointment?.status)) return false;
        const date = getAppointmentDate(appointment);
        if (!date) return true;
        return date >= startOfToday;
      })
      .sort((first, second) => {
        const firstTime = getAppointmentDate(first)?.getTime() || 0;
        const secondTime = getAppointmentDate(second)?.getTime() || 0;
        return firstTime - secondTime;
      });
  }, [appointments]);

  const stats = [
    { label: 'Clients', value: uniqueClientsCount, icon: Users },
    { label: 'Followers', value: followersCount, icon: Users },
    { label: 'Upcoming', value: activeUpcomingAppointments.length, icon: CalendarDays },
  ];

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return;

    const url = `https://www.bing.com/images/search?q=${encodeURIComponent(`${trimmedQuery} hairstyle`)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f4fb] pb-28 lg:pb-10">
        <div className="flex flex-col items-center gap-3 text-[#7c52d4]">
          <Loader2 className="animate-spin" size={30} />
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#7c52d4]/70">
            Loading dashboard
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f4fb] pb-28 lg:pb-10">
      <div className="mx-auto w-full max-w-7xl px-3 pt-3 sm:px-5 sm:pt-5 lg:px-8 lg:pt-7">
        <div className="space-y-4 md:space-y-5">
          <section className="rounded-[26px] bg-gradient-to-br from-[#8d5be6] via-[#7e58d8] to-[#6f49cc] p-4 text-white shadow-[0_18px_48px_rgba(111,73,204,0.35)] sm:p-5 md:rounded-[32px] md:p-7">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3 md:gap-4">
                <img
                  src={profileImage}
                  alt={displayName}
                  className="h-12 w-12 rounded-full border-2 border-white/60 object-cover md:h-16 md:w-16"
                />
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/75 md:text-[11px]">
                    Stylist homepage
                  </p>
                  <h1 className="truncate text-base font-semibold md:text-2xl">{displayName}</h1>
                  <div className="mt-1 flex items-center gap-1 text-xs text-white/90 md:text-sm">
                    <span>{ratingLabel}</span>
                    <Star size={12} className="fill-yellow-300 text-yellow-300 md:h-4 md:w-4" />
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate('/notifications')}
                className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/12 transition hover:bg-white/20 md:h-11 md:w-11"
                aria-label="Open notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2.5 md:mt-6 md:gap-3">
              {stats.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="rounded-[14px] border border-white/20 bg-white/14 px-3 py-2.5 backdrop-blur-sm md:rounded-[18px] md:px-4 md:py-3"
                  >
                    <Icon size={13} className="text-white/90 md:h-4 md:w-4" />
                    <p className="mt-1 text-lg font-bold leading-none md:mt-2 md:text-2xl">{item.value}</p>
                    <p className="mt-1 text-[11px] text-white/80 md:text-xs">{item.label}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <form onSubmit={handleSearchSubmit}>
            <div className="relative overflow-hidden rounded-[16px] border border-zinc-200 bg-white shadow-sm md:rounded-[20px]">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Find a style or hairstyle inspiration"
                className="w-full bg-transparent py-3.5 pl-11 pr-4 text-sm text-zinc-700 outline-none md:py-4 md:text-[15px]"
              />
            </div>
          </form>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="rounded-[24px] bg-white p-4 shadow-sm md:rounded-[30px] md:p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-[15px] font-semibold text-zinc-900 md:text-lg">Featured styles</h2>
                <button
                  type="button"
                  onClick={() => navigate('/portfolio')}
                  className="text-xs font-semibold text-[#7b53d3] transition hover:text-[#6a41c6]"
                >
                  See all
                </button>
              </div>

              {featuredStyles.length > 0 ? (
                <div className="hide-scrollbar flex gap-3 overflow-x-auto pb-1 md:grid md:grid-cols-3 md:gap-3 lg:grid-cols-4">
                  {featuredStyles.map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => navigate('/portfolio')}
                      className="group relative h-28 w-24 shrink-0 overflow-hidden rounded-[14px] bg-zinc-100 md:h-36 md:w-full md:rounded-[18px] lg:h-44"
                    >
                      <img
                        src={style.image}
                        alt={style.styleName || 'Featured style'}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-2 text-left">
                        <p className="truncate text-[10px] font-medium text-white md:text-[11px]">
                          {style.styleName || 'Featured style'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-[18px] border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
                  Your saved styles will appear here.
                </div>
              )}
            </section>

            <section className="rounded-[24px] bg-white p-4 shadow-sm md:rounded-[30px] md:p-5 xl:sticky xl:top-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-[15px] font-semibold text-zinc-900 md:text-lg">Upcoming</h2>
                <button
                  type="button"
                  onClick={() => navigate('/calendar')}
                  className="text-xs font-semibold text-[#7b53d3] transition hover:text-[#6a41c6]"
                >
                  See all
                </button>
              </div>

              {activeUpcomingAppointments.length > 0 ? (
                <div className="space-y-2.5 md:space-y-3">
                  {activeUpcomingAppointments.slice(0, 7).map((appointment) => (
                    <button
                      key={appointment.id}
                      type="button"
                      onClick={() => navigate('/calendar')}
                      className="flex w-full items-start justify-between gap-3 rounded-[14px] border border-zinc-200 bg-white px-3 py-2.5 text-left transition hover:border-[#d8caf8] hover:bg-[#fbf9ff] md:rounded-[16px] md:px-3.5 md:py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-zinc-900">
                          {appointment.clientName ||
                            appointment.customerName ||
                            appointment.client ||
                            appointment.clientEmail ||
                            'Client'}
                        </p>
                        <p className="mt-0.5 text-[11px] text-zinc-500">{getDayLabel(appointment)}</p>
                        <p className="text-[11px] text-zinc-500">{getPeriodLabel(appointment)}</p>
                      </div>

                      <span
                        className={`shrink-0 pt-0.5 text-[11px] font-semibold ${getStatusClasses(
                          appointment.status
                        )}`}
                      >
                        {getStatusLabel(appointment.status)}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-[18px] border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
                  No upcoming appointments yet.
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

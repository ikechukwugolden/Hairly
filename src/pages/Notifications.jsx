import { useEffect, useMemo, useState } from 'react';
import { Bell, CalendarCheck2, Check, CheckCircle2, Clock3, Loader2, Sparkles, Wallet, XCircle } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from '../../firebaseconfig';

function toMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  return 0;
}

function formatRelativeTime(value) {
  const ms = toMillis(value);
  if (!ms) return 'Just now';
  const delta = Date.now() - ms;
  const minutes = Math.floor(delta / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ms).toLocaleDateString();
}

const typeToIcon = {
  booking: CalendarCheck2,
  booking_request: CalendarCheck2,
  booking_confirmed: CheckCircle2,
  booking_denied: XCircle,
  payment: Wallet,
  reminder: Clock3,
  insight: Sparkles,
};

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyActionId, setBusyActionId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserName, setCurrentUserName] = useState('');
  const [currentUserImage, setCurrentUserImage] = useState('');

  useEffect(() => {
    let unsubscribeSnapshot = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      unsubscribeSnapshot();
      setCurrentUser(user || null);

      if (!user) {
        setItems([]);
        setCurrentUserName('');
        setCurrentUserImage('');
        setLoading(false);
        return;
      }

      try {
        const profileDoc = await getDoc(doc(db, 'users', user.uid));
        const profile = profileDoc.exists() ? profileDoc.data() : null;
        setCurrentUserName(profile?.businessName || profile?.fullName || user.displayName || 'Stylist');
        setCurrentUserImage(profile?.profileImage || user.photoURL || '');
      } catch {
        setCurrentUserName(user.displayName || 'Stylist');
        setCurrentUserImage(user.photoURL || '');
      }

      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', user.uid)
      );

      setLoading(true);
      unsubscribeSnapshot = onSnapshot(
        notificationsQuery,
        (snapshot) => {
          const list = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
          list.sort(
            (a, b) =>
              (toMillis(b.createdAt) || toMillis(b.timestamp)) -
              (toMillis(a.createdAt) || toMillis(a.timestamp))
          );
          setItems(list);
          setLoading(false);
        },
        (error) => {
          console.error('Notifications stream error:', error);
          setItems([]);
          setLoading(false);
        }
      );
    });

    return () => {
      unsubscribeSnapshot();
      unsubscribeAuth();
    };
  }, []);

  const unreadCount = useMemo(
    () => items.filter((item) => item.read !== true).length,
    [items]
  );

  const markAllAsRead = async () => {
    const unreadItems = items.filter((item) => item.read !== true);
    if (unreadItems.length === 0) return;
    try {
      await Promise.all(
        unreadItems.map((item) =>
          updateDoc(doc(db, 'notifications', item.id), {
            read: true,
          })
        )
      );
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const toggleRead = async (item) => {
    try {
      await updateDoc(doc(db, 'notifications', item.id), {
        read: item.read !== true,
      });
    } catch (error) {
      console.error('Failed to update notification:', error);
    }
  };

  const resolvePendingAppointment = async (item) => {
    if (item.appointmentId) {
      const byId = await getDoc(doc(db, 'appointments', item.appointmentId));
      if (byId.exists()) return { id: byId.id, ...byId.data() };
    }

    if (!currentUser?.uid) return null;

    const snapshot = await getDocs(
      query(collection(db, 'appointments'), where('stylistId', '==', currentUser.uid))
    );

    const pending = snapshot.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
      .filter((appointment) => String(appointment.status || 'pending').toLowerCase() === 'pending');

    const matched = pending.find((appointment) =>
      (item.actorId && appointment.customerId === item.actorId)
      || (item.customerId && appointment.customerId === item.customerId)
      || ((item.actorName || item.customerName) && (appointment.customerName || appointment.clientName) === (item.actorName || item.customerName))
    );

    if (matched) return matched;

    const sorted = pending.sort((a, b) => (toMillis(b.createdAt) - toMillis(a.createdAt)));
    return sorted[0] || null;
  };

  const handleBookingAction = async (item, nextStatus) => {
    if (!currentUser?.uid || busyActionId) return;
    setBusyActionId(item.id);

    try {
      const appointment = await resolvePendingAppointment(item);
      if (!appointment?.id) {
        await updateDoc(doc(db, 'notifications', item.id), {
          read: true,
          actionTaken: true,
          actionStatus: 'not_found',
          actionAt: serverTimestamp(),
        });
        return;
      }

      await updateDoc(doc(db, 'appointments', appointment.id), {
        status: nextStatus,
        updatedBy: currentUser.uid,
        updatedAt: serverTimestamp(),
      });

      await updateDoc(doc(db, 'notifications', item.id), {
        read: true,
        actionTaken: true,
        actionStatus: nextStatus,
        actionAt: serverTimestamp(),
        appointmentId: appointment.id,
      });

      const targetCustomerId = appointment.customerId || item.customerId || item.actorId;
      if (targetCustomerId) {
        await addDoc(collection(db, 'notifications'), {
          userId: targetCustomerId,
          actorId: currentUser.uid,
          actorName: currentUserName,
          actorImage: currentUserImage,
          type: nextStatus === 'confirmed' ? 'booking_confirmed' : 'booking_denied',
          title: nextStatus === 'confirmed' ? 'Booking confirmed' : 'Booking declined',
          message: nextStatus === 'confirmed'
            ? `${currentUserName} confirmed your booking for ${appointment.service || 'your service'}.`
            : `${currentUserName} declined your booking request.`,
          appointmentId: appointment.id,
          read: false,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('Failed to process booking action from notifications:', error);
    } finally {
      setBusyActionId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] pb-24">
      <div className="bg-[#7c3aed] p-6 pt-12 rounded-b-[40px] text-white shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] font-black opacity-80">Activity Center</p>
            <h1 className="text-2xl font-black mt-1">Notifications</h1>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.15em] font-black text-white/80">Unread</p>
            <p className="text-3xl font-black leading-none">{unreadCount}</p>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
            className="text-xs font-bold text-[#7c3aed] bg-violet-50 hover:bg-violet-100 px-4 py-2 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Mark all as read
          </button>
        </div>

        {loading ? (
          <div className="mt-4 rounded-3xl p-10 bg-white border border-zinc-100 text-center text-zinc-400 font-bold text-sm">
            <Loader2 className="mx-auto mb-2 animate-spin" size={22} />
            Loading notifications...
          </div>
        ) : items.length === 0 ? (
          <div className="mt-4 rounded-3xl p-10 bg-white border border-zinc-100 text-center">
            <Bell className="mx-auto text-zinc-300 mb-2" size={28} />
            <p className="font-bold text-zinc-500">No notifications yet.</p>
            <p className="text-sm text-zinc-400 mt-1">Real updates will show up here automatically.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {items.map((item) => {
              const Icon = typeToIcon[item.type] || Bell;
              const actorName = item.actorName || item.customerName || 'User';
              const actorImage = item.actorImage || item.customerImage || '';
              const canResolveBooking = item.type === 'booking_request' && item.actionTaken !== true;

              return (
                <div
                  key={item.id}
                  className={`w-full text-left rounded-3xl p-4 border transition-all ${
                    item.read === true ? 'bg-white border-zinc-100' : 'bg-violet-50/60 border-violet-200'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="relative w-11 h-11 rounded-2xl overflow-hidden bg-zinc-100 flex items-center justify-center">
                      {actorImage ? (
                        <img src={actorImage} alt={actorName} className="w-full h-full object-cover" />
                      ) : (
                        <Icon size={18} className="text-zinc-500" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex justify-between gap-3">
                        <h2 className="font-black text-sm text-zinc-800">{item.title || 'Notification'}</h2>
                        <span className="text-[11px] text-zinc-400 font-medium">
                          {formatRelativeTime(item.createdAt || item.timestamp)}
                        </span>
                      </div>

                      <p className="text-[11px] text-zinc-500 mt-1 font-bold">{actorName}</p>
                      <p className="text-sm text-zinc-600 mt-1">{item.message || 'You have a new update.'}</p>

                      {canResolveBooking && (
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            disabled={busyActionId === item.id}
                            onClick={() => handleBookingAction(item, 'confirmed')}
                            className="h-8 px-3 rounded-lg bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider disabled:opacity-60"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            disabled={busyActionId === item.id}
                            onClick={() => handleBookingAction(item, 'declined')}
                            className="h-8 px-3 rounded-lg bg-red-500 text-white text-[10px] font-black uppercase tracking-wider disabled:opacity-60"
                          >
                            Deny
                          </button>
                        </div>
                      )}

                      {item.actionTaken === true && (
                        <p className="mt-3 text-[11px] font-black uppercase tracking-widest text-zinc-400">
                          {item.actionStatus === 'confirmed'
                            ? 'Booking confirmed'
                            : item.actionStatus === 'declined'
                              ? 'Booking denied'
                              : 'Action completed'}
                        </p>
                      )}

                      <div className="mt-3 text-[11px] font-bold uppercase tracking-widest">
                        <button
                          type="button"
                          onClick={() => toggleRead(item)}
                          className={item.read === true ? 'text-zinc-400' : 'text-[#7c3aed]'}
                        >
                          {item.read === true ? 'Mark unread' : 'Mark as read'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

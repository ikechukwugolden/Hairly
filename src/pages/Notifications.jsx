import { useEffect, useMemo, useState } from 'react';
import { Bell, CalendarCheck2, Check, Clock3, Loader2, Sparkles, Wallet } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
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
  payment: Wallet,
  reminder: Clock3,
  insight: Sparkles,
};

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeSnapshot = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      unsubscribeSnapshot();

      if (!user) {
        setItems([]);
        setLoading(false);
        return;
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
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleRead(item)}
                  className={`w-full text-left rounded-3xl p-4 border transition-all ${
                    item.read === true ? 'bg-white border-zinc-100' : 'bg-violet-50/60 border-violet-200'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                        item.read === true ? 'bg-zinc-100 text-zinc-500' : 'bg-[#7c3aed] text-white'
                      }`}
                    >
                      <Icon size={18} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between gap-3">
                        <h2 className="font-black text-sm text-zinc-800">{item.title || 'Notification'}</h2>
                        <span className="text-[11px] text-zinc-400 font-medium">
                          {formatRelativeTime(item.createdAt || item.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-600 mt-1">{item.message || 'You have a new update.'}</p>
                      <div className="mt-3 text-[11px] font-bold uppercase tracking-widest">
                        {item.read === true ? (
                          <span className="inline-flex items-center gap-1 text-zinc-400">
                            <Check size={12} />
                            Read
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[#7c3aed]">Tap to mark as read</span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

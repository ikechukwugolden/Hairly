import { ChevronLeft, ChevronRight, Clock, Loader2, MapPin } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../../firebaseconfig';

const startOfDay = (value) => new Date(value.getFullYear(), value.getMonth(), value.getDate());

const toDate = (value) => {
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
};

const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const getStartOfWeek = (date) => {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return startOfDay(new Date(date.getFullYear(), date.getMonth(), date.getDate() + diff));
};

const getWeekDays = (weekStart) =>
  Array.from({ length: 7 }, (_, index) =>
    new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + index)
  );

const getAppointmentDate = (appointment) => {
  return (
    toDate(appointment.date) ||
    toDate(appointment.appointmentDate) ||
    toDate(appointment.scheduledAt) ||
    toDate(appointment.dateTime) ||
    null
  );
};

export default function CalendarPage() {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [weekStart, setWeekStart] = useState(getStartOfWeek(today));
  const [selectedDate, setSelectedDate] = useState(today);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setAppointments([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const appointmentsRef = collection(db, 'appointments');
        const appointmentsQuery = query(appointmentsRef, where('stylistId', '==', user.uid));
        const snapshot = await getDocs(appointmentsQuery);

        const fetchedAppointments = snapshot.docs.map((docSnapshot) => ({
          id: docSnapshot.id,
          ...docSnapshot.data()
        }));

        setAppointments(fetchedAppointments);
      } catch (error) {
        console.error('Calendar load error:', error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);

  const dailyAppointments = useMemo(() => {
    return appointments
      .filter((appointment) => {
        const appointmentDate = getAppointmentDate(appointment);
        if (!appointmentDate) return true;
        return sameDay(appointmentDate, selectedDate);
      })
      .sort((a, b) => {
        const first = getAppointmentDate(a)?.getTime() || 0;
        const second = getAppointmentDate(b)?.getTime() || 0;
        return first - second;
      });
  }, [appointments, selectedDate]);

  const monthLabel = selectedDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  const shiftWeek = (direction) => {
    const nextWeekStart = startOfDay(new Date(
      weekStart.getFullYear(),
      weekStart.getMonth(),
      weekStart.getDate() + direction * 7
    ));

    setWeekStart(nextWeekStart);
    setSelectedDate(nextWeekStart);
  };

  return (
    <div className="min-h-screen bg-white pb-28 md:pb-10">
      <div className="bg-[#7c3aed] p-6 pt-12 rounded-b-[40px] text-white shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold">Appointments</h1>
          <div className="bg-white/20 p-2 rounded-full">
            <Clock size={20} />
          </div>
        </div>

        <div className="flex justify-between items-center mb-4 px-2">
          <span className="font-bold">{monthLabel}</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => shiftWeek(-1)}
              className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => shiftWeek(1)}
              className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => {
            const isSelected = sameDay(day, selectedDate);
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => setSelectedDate(startOfDay(day))}
                className={`flex flex-col items-center p-3 rounded-2xl transition-all cursor-pointer ${
                  isSelected ? 'bg-white text-[#7c3aed] shadow-md scale-105' : 'text-white/60 hover:text-white'
                }`}
              >
                <span className="text-[10px] font-bold uppercase">
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
                <span className="text-lg font-black">{day.getDate()}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-bold text-zinc-800">Schedule Details</h2>
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            {dailyAppointments.length} bookings
          </span>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Loader2 size={28} className="animate-spin text-[#7c3aed]" />
            <p className="mt-2 text-xs font-bold text-zinc-400 uppercase tracking-widest">Loading schedule...</p>
          </div>
        ) : dailyAppointments.length ? (
          <div className="space-y-6">
            {dailyAppointments.map((appointment) => {
              const appointmentDate = getAppointmentDate(appointment);
              const timeLabel =
                appointment.time ||
                (appointmentDate
                  ? appointmentDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                  : 'Scheduled');

              return (
                <div key={appointment.id} className="flex gap-4">
                  <div className="flex flex-col items-center w-16">
                    <span className="text-[11px] font-bold text-zinc-800">{timeLabel}</span>
                    <div className="w-[1px] h-12 bg-zinc-100 my-2" />
                  </div>

                  <div className="flex-1 bg-white p-4 rounded-[24px] border border-zinc-100 relative shadow-sm">
                    <div className="absolute top-4 left-0 w-1 h-8 bg-[#7c3aed] rounded-r-full" />
                    <h3 className="font-bold text-sm mb-1">
                      {appointment.service || appointment.serviceName || appointment.styleName || 'Hair Appointment'}
                    </h3>
                    <p className="text-[#7c3aed] text-[10px] font-bold mb-3">
                      {appointment.clientName || appointment.client || appointment.clientEmail || 'Valued Client'}
                    </p>
                    <div className="flex items-center gap-1 text-zinc-400 text-[10px]">
                      <MapPin size={10} />
                      <span>{appointment.address || appointment.location || 'Address not provided'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-[32px] p-8 text-center">
            <Clock className="text-zinc-300 mx-auto mb-3" size={30} />
            <p className="text-zinc-500 font-bold text-sm">No appointments for this date</p>
            <p className="text-zinc-400 text-xs mt-1">Choose another day to view upcoming bookings.</p>
          </div>
        )}
      </div>
    </div>
  );
}

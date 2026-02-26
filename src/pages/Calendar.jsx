import { ChevronLeft, ChevronRight, Clock, MapPin, Calendar, Users, Home as HomeIcon, Briefcase, User } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function CalendarPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedDate, setSelectedDate] = useState(24);

  const days = [
    { day: 'Mon', date: 21 },
    { day: 'Tue', date: 22 },
    { day: 'Wed', date: 23 },
    { day: 'Thu', date: 24 },
    { day: 'Fri', date: 25 },
    { day: 'Sat', date: 26 },
  ];

  const appointments = [
    {
      time: "10:00 AM",
      service: "Knotless Braids",
      client: "Sarah Johnson",
      address: "No. 12 Hospital Rd, Aba",
      status: "Upcoming"
    },
    {
      time: "02:30 PM",
      service: "Wig Installation",
      client: "Chioma Okoro",
      address: "Home Service",
      status: "Upcoming"
    }
  ];

  // Helper for active state
  const getNavClass = (path) => 
    `flex flex-col items-center gap-1 flex-1 transition-all ${location.pathname === path ? 'text-[#7c3aed]' : 'text-zinc-400'}`;

  return (
    <div className="min-h-screen bg-white pb-32"> {/* Increased padding bottom */}
      {/* Header */}
      <div className="bg-[#7c3aed] p-6 pt-12 rounded-b-[40px] text-white shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold">Appointments</h1>
          <div className="bg-white/20 p-2 rounded-full">
            <Clock size={20} />
          </div>
        </div>

        {/* Date Selector */}
        <div className="flex justify-between items-center mb-4 px-2">
          <span className="font-bold">February 2026</span>
          <div className="flex gap-4">
            <ChevronLeft size={20} className="opacity-50" />
            <ChevronRight size={20} />
          </div>
        </div>

        <div className="flex justify-between">
          {days.map((d) => (
            <div 
              key={d.date} 
              onClick={() => setSelectedDate(d.date)}
              className={`flex flex-col items-center p-3 rounded-2xl transition-all cursor-pointer ${
                selectedDate === d.date ? 'bg-white text-[#7c3aed] shadow-md scale-105' : 'text-white/60'
              }`}
            >
              <span className="text-[10px] font-bold uppercase">{d.day}</span>
              <span className="text-lg font-black">{d.date}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Appointment List */}
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-bold text-zinc-800">Schedule Details</h2>
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{appointments.length} bookings</span>
        </div>

        <div className="space-y-6">
          {appointments.map((app, i) => (
            <div key={i} className="flex gap-4">
              <div className="flex flex-col items-center w-16">
                <span className="text-[11px] font-bold text-zinc-800">{app.time}</span>
                <div className="w-[1px] h-12 bg-zinc-100 my-2"></div>
              </div>
              
              <div className="flex-1 bg-white p-4 rounded-[24px] border border-zinc-100 relative shadow-sm">
                <div className="absolute top-4 left-0 w-1 h-8 bg-[#7c3aed] rounded-r-full"></div>
                <h3 className="font-bold text-sm mb-1">{app.service}</h3>
                <p className="text-[#7c3aed] text-[10px] font-bold mb-3">{app.client}</p>
                <div className="flex items-center gap-1 text-zinc-400 text-[10px]">
                  <MapPin size={10} />
                  <span>{app.address}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FIXED NAVIGATION BAR */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-100 pt-3 pb-8 z-50">
        <div className="flex justify-around items-center px-4 max-w-md mx-auto">
          <button onClick={() => navigate('/home')} className={getNavClass('/home')}>
            <HomeIcon size={24} />
            <span className="text-[10px] font-bold">Home</span>
          </button>
          
          <button onClick={() => navigate('/explore')} className={getNavClass('/explore')}>
            <Users size={24} />
            <span className="text-[10px] font-medium">Explore</span>
          </button>
          
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
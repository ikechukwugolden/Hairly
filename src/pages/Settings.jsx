import { useEffect, useState } from 'react';
import { Bell, Globe2, Lock, Shield, Smartphone, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';

const STORAGE_KEY = 'hairly_settings';

const defaultSettings = {
  pushAlerts: true,
  bookingReminders: true,
  marketingMessages: false,
  twoFactorAuth: false,
  autoSync: true,
  language: 'English'
};

const loadSavedSettings = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSettings;
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return defaultSettings;
  }
};

const settingItems = [
  {
    key: 'pushAlerts',
    icon: Bell,
    label: 'Push Alerts',
    description: 'Receive app-wide alerts for key activity.'
  },
  {
    key: 'bookingReminders',
    icon: Smartphone,
    label: 'Booking Reminders',
    description: 'Get reminders before each upcoming appointment.'
  },
  {
    key: 'marketingMessages',
    icon: Globe2,
    label: 'Marketing Messages',
    description: 'Receive growth tips, trend updates, and promotions.'
  },
  {
    key: 'twoFactorAuth',
    icon: Shield,
    label: 'Two-Factor Authentication',
    description: 'Add an extra layer of security to your account.'
  },
  {
    key: 'autoSync',
    icon: Lock,
    label: 'Auto Sync',
    description: 'Keep profile and booking data synced automatically.'
  }
];

export default function Settings() {
  const [settings, setSettings] = useState(loadSavedSettings);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const toggle = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] pb-24">
      <div className="bg-[#7c3aed] p-6 pt-12 rounded-b-[40px] text-white shadow-lg">
        <p className="text-[10px] uppercase tracking-[0.2em] font-black opacity-80">Preferences</p>
        <h1 className="text-2xl font-black mt-1">Settings</h1>
        <p className="text-sm text-white/80 mt-2 max-w-xl">
          Your choices are saved on this device and used to personalize your Hairly experience.
        </p>
      </div>

      <div className="p-6 max-w-4xl mx-auto space-y-3">
        {settingItems.map((item) => {
          const Icon = item.icon;
          const value = Boolean(settings[item.key]);

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => toggle(item.key)}
              className="w-full bg-white border border-zinc-100 rounded-3xl p-4 text-left shadow-sm"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-zinc-100 text-zinc-600 rounded-2xl flex items-center justify-center shrink-0">
                    <Icon size={18} />
                  </div>
                  <div>
                    <h2 className="font-black text-sm text-zinc-800">{item.label}</h2>
                    <p className="text-xs text-zinc-500 mt-1">{item.description}</p>
                  </div>
                </div>
                <div className={value ? 'text-[#7c3aed]' : 'text-zinc-300'}>
                  {value ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                </div>
              </div>
            </button>
          );
        })}

        <div className="bg-white border border-red-100 rounded-3xl p-4 mt-6">
          <h2 className="font-black text-red-600 text-sm uppercase tracking-widest">Danger Zone</h2>
          <p className="text-sm text-zinc-600 mt-2">
            Need a fresh start? This removes saved local preferences on this device.
          </p>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem(STORAGE_KEY);
              setSettings(defaultSettings);
            }}
            className="mt-3 inline-flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider"
          >
            <Trash2 size={14} />
            Reset Local Settings
          </button>
        </div>
      </div>
    </div>
  );
}

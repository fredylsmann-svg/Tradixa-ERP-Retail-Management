import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { api } from '@/api/client';
import { Zap } from 'lucide-react';

export default function SidebarTimeDisplay() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { user } = useAuth();
  const [store, setStore] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (user?.current_store_id) {
      api.entities.Store.get(user.current_store_id).then(setStore).catch(console.error);
    }
  }, [user?.current_store_id]);

  const formatWIBTime = (date) => {
    const wibOffset = 7 * 60;
    const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
    const wibTime = new Date(utc + (wibOffset * 60000));
    
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    const dayName = days[wibTime.getDay()];
    const day = wibTime.getDate();
    const month = months[wibTime.getMonth()];
    const year = wibTime.getFullYear();
    const hours = String(wibTime.getHours()).padStart(2, '0');
    const minutes = String(wibTime.getMinutes()).padStart(2, '0');
    const seconds = String(wibTime.getSeconds()).padStart(2, '0');
    
    return {
      date: `${dayName}, ${day} ${month} ${year}`,
      time: `${hours}:${minutes}:${seconds}`
    };
  };

  const timeDisplay = formatWIBTime(currentTime);

  // Calculate Trial Remaining Days
  let trialRemaining = null;
  if (store && store.plan === 'pro' && store.has_used_trial && store.plan_expires_at) {
    const expires = new Date(store.plan_expires_at);
    const now = new Date();
    const diffTime = expires - now;
    if (diffTime > 0) {
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      trialRemaining = diffDays;
    }
  }

  return (
    <div className="p-4 border-t border-slate-100 bg-slate-50 flex-shrink-0">
      {trialRemaining !== null && (
        <div className="mb-3 p-2.5 rounded-xl bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-blue-500 flex flex-shrink-0 items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Pro Trial</p>
            <p className="text-xs font-semibold text-blue-600">Sisa {trialRemaining} Hari</p>
          </div>
        </div>
      )}
      <p className="text-xs text-slate-500">{timeDisplay.date}</p>
      <div className="flex items-center justify-between mt-1">
        <p className="text-xl font-bold text-slate-800">{timeDisplay.time} <span className="text-sm font-medium">WIB</span></p>
        <span className="text-xs text-slate-400">UTC+7</span>
      </div>
    </div>
  );
}

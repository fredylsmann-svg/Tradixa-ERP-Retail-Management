import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { Zap } from 'lucide-react';

export default function SidebarTimeDisplay() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { user } = useAuth();
  const [store, setStore] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user?.current_store_id) return;
    supabase
      .from('stores')
      .select('plan, has_used_trial, plan_expires_at')
      .eq('id', user.current_store_id)
      .single()
      .then(({ data }) => { if (data) setStore(data); })
      .catch(console.error);
  }, [user?.current_store_id]);

  const formatWIBTime = (date) => {
    const wibOffset = 7 * 60;
    const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
    const wibTime = new Date(utc + (wibOffset * 60000));
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return {
      date: `${days[wibTime.getDay()]}, ${wibTime.getDate()} ${months[wibTime.getMonth()]} ${wibTime.getFullYear()}`,
      time: `${String(wibTime.getHours()).padStart(2, '0')}:${String(wibTime.getMinutes()).padStart(2, '0')}:${String(wibTime.getSeconds()).padStart(2, '0')}`
    };
  };

  const timeDisplay = formatWIBTime(currentTime);

  return (
    <div className="p-4 border-t border-slate-100 bg-slate-50 dark:bg-slate-950 flex-shrink-0">
      <p className="text-xs text-slate-500 dark:text-slate-400">{timeDisplay.date}</p>
      <div className="flex items-center justify-between mt-1">
        <p className="text-xl font-bold text-slate-800 dark:text-slate-200">{timeDisplay.time} <span className="text-sm font-medium">WIB</span></p>
        <span className="text-xs text-slate-400">UTC+7</span>
      </div>
    </div>
  );
}

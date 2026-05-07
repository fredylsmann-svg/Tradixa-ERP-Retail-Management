import React, { useState, useEffect } from 'react';

export default function SidebarTimeDisplay() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

  return (
    <div className="p-4 border-t border-slate-100 bg-slate-50 flex-shrink-0">
      <p className="text-xs text-slate-500">{timeDisplay.date}</p>
      <div className="flex items-center justify-between mt-1">
        <p className="text-xl font-bold text-slate-800">{timeDisplay.time} <span className="text-sm font-medium">WIB</span></p>
        <span className="text-xs text-slate-400">UTC+7</span>
      </div>
    </div>
  );
}

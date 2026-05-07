import React, { useState, useRef, useEffect } from 'react';
import { useGlobalDate } from '@/contexts/DateContext';
import { ChevronLeft, ChevronRight, Calendar, RotateCcw } from 'lucide-react';

const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function MiniCalendar({ value, onChange, onClose }) {
  const d = new Date(value);
  const [viewYear, setViewYear] = useState(d.getFullYear());
  const [viewMonth, setViewMonth] = useState(d.getMonth());
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

  const cells = [];
  for (let i = firstDay - 1; i >= 0; i--) cells.push({ day: prevMonthDays - i, current: false });
  for (let i = 1; i <= daysInMonth; i++) cells.push({ day: i, current: true });
  const remaining = 42 - cells.length;
  for (let i = 1; i <= remaining; i++) cells.push({ day: i, current: false });

  const selectedParts = value.split('-');
  const selYear = Number(selectedParts[0]);
  const selMonth = Number(selectedParts[1]) - 1;
  const selDay = Number(selectedParts[2]);
  const todayStr = new Date().toISOString().split('T')[0];

  const handleSelect = (day) => {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    onChange(`${viewYear}-${mm}-${dd}`);
    onClose();
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  return (
    <div ref={ref} className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-[100] w-[300px] select-none" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-3">
        <span className="font-bold text-slate-800 text-sm">{MONTHS[viewMonth]} {viewYear}</span>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"><ChevronLeft className="w-4 h-4 text-slate-600" /></button>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"><ChevronRight className="w-4 h-4 text-slate-600" /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-0 mb-1">
        {DAYS.map(d => (<div key={d} className="text-center text-xs font-semibold text-slate-400 py-1">{d}</div>))}
      </div>
      <div className="grid grid-cols-7 gap-0">
        {cells.map((cell, idx) => {
          const isSelected = cell.current && cell.day === selDay && viewMonth === selMonth && viewYear === selYear;
          const isToday = cell.current && `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}` === todayStr;
          return (
            <button key={idx} onClick={() => cell.current && handleSelect(cell.day)} disabled={!cell.current}
              className={`w-9 h-9 mx-auto rounded-lg text-sm font-medium transition-all
                ${!cell.current ? 'text-slate-300 cursor-default' : 'hover:bg-blue-50 cursor-pointer'}
                ${isSelected ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-600/30' : ''}
                ${isToday && !isSelected ? 'bg-blue-50 text-blue-600 font-bold ring-1 ring-blue-200' : ''}
                ${cell.current && !isSelected && !isToday ? 'text-slate-700' : ''}
              `}>{cell.day}</button>
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
        <button onClick={() => { onChange(todayStr); onClose(); }} className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">Hari Ini</button>
      </div>
    </div>
  );
}

/**
 * Inline Date Picker — ditempatkan di setiap halaman operasional,
 * di sebelah judul (bukan di Header global).
 */
export default function PageDatePicker() {
  const { selectedDate, setSelectedDate, isToday, goToday, goPrev, goNext, formattedDate } = useGlobalDate();
  const [showCalendar, setShowCalendar] = useState(false);

  return (
    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-1.5 relative shadow-sm">
      <button onClick={goPrev} className="p-1 rounded-md hover:bg-slate-100 transition-colors" title="Hari sebelumnya">
        <ChevronLeft className="w-4 h-4 text-slate-500" />
      </button>
      <button onClick={() => setShowCalendar(!showCalendar)} className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg hover:bg-slate-50 transition-colors">
        <Calendar className="w-4 h-4 text-blue-600" />
        <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">{formattedDate}</span>
      </button>
      <button onClick={goNext} className="p-1 rounded-md hover:bg-slate-100 transition-colors" title="Hari berikutnya">
        <ChevronRight className="w-4 h-4 text-slate-500" />
      </button>
      {!isToday && (
        <button onClick={goToday} className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors ml-1" title="Kembali ke hari ini">
          <RotateCcw className="w-3 h-3" />Hari ini
        </button>
      )}
      {showCalendar && (
        <MiniCalendar value={selectedDate} onChange={(d) => setSelectedDate(d)} onClose={() => setShowCalendar(false)} />
      )}
    </div>
  );
}

import React, { createContext, useContext, useState } from 'react';

const DateContext = createContext();

/**
 * Global Date Provider — menyimpan tanggal operasional aktif.
 * Default: hari ini. Semua modul operasional membaca dari sini 
 * untuk filter data harian (Sales, Stock, Expenses, Journal, dll).
 */
export function DateProvider({ children }) {
  // Get current date in WIB (UTC+7)
  const getWIBToday = () => {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const wib = new Date(utc + (7 * 60 * 60000));
    const y = wib.getFullYear();
    const m = String(wib.getMonth() + 1).padStart(2, '0');
    const d = String(wib.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const [selectedDate, setSelectedDate] = useState(getWIBToday());

  const isToday = selectedDate === getWIBToday();

  const goToday = () => setSelectedDate(getWIBToday());
  const goPrev = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };
  const goNext = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const formattedDate = new Date(selectedDate).toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <DateContext.Provider value={{ selectedDate, setSelectedDate, isToday, goToday, goPrev, goNext, formattedDate }}>
      {children}
    </DateContext.Provider>
  );
}

export function useGlobalDate() {
  const ctx = useContext(DateContext);
  if (!ctx) throw new Error('useGlobalDate must be used within DateProvider');
  return ctx;
}

/**
 * Utility: cek apakah sebuah item cocok dengan tanggal yang dipilih.
 * Mendukung field: date, created_date, timestamp_wib
 */
export function matchesDate(item, targetDate) {
  // Helper to convert any date string to YYYY-MM-DD in WIB
  const toWIBDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return null;
      const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
      const wib = new Date(utc + (7 * 60 * 60000));
      const y = wib.getFullYear();
      const m = String(wib.getMonth() + 1).padStart(2, '0');
      const day = String(wib.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    } catch (e) { return null; }
  };

  // 1. Check 'timestamp_wib' first (already in WIB DD/MM/YYYY)
  if (item.timestamp_wib) {
    const datePart = item.timestamp_wib.replace(',', '').split(' ')[0];
    const parts = datePart.split('/');
    if (parts.length === 3) {
      // Ensure zero padding for month and day
      const d = parts[0].padStart(2, '0');
      const m = parts[1].padStart(2, '0');
      const y = parts[2];
      return `${y}-${m}-${d}` === targetDate;
    }
  }

  // 2. Check 'date' field (often manual input)
  if (item.date) {
    const itemDate = item.date.includes('T') ? item.date.split('T')[0] : item.date;
    return itemDate === targetDate;
  }

  // 3. Check 'created_at' or 'created_date' (Database UTC time)
  // We MUST convert this to WIB before comparing
  const dbDate = item.created_at || item.created_date;
  if (dbDate) {
    const wibDate = toWIBDate(dbDate);
    if (wibDate) return wibDate === targetDate;
  }

  return false;
}

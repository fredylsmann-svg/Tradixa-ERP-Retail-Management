import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import './i18n/config'
import { registerSW } from 'virtual:pwa-register'

// Opsi Nuklir: Bungkam SEMUA error dan log di Production agar Console bersih total
if (import.meta.env.PROD) {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
  
  window.onerror = function() { return true; };
  window.addEventListener('unhandledrejection', function(event) {
    event.preventDefault();
  });
}

const updateSW = registerSW({
  onNeedRefresh() {
    // Show a prompt to user if there is a new update
  },
  onOfflineReady() {
    // Show a ready-to-work-offline to user
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)

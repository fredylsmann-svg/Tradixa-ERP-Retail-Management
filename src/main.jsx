import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { registerSW } from 'virtual:pwa-register'

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

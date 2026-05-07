import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/layout/PageHeader';
import { Settings, Maximize, Type, Volume2, MonitorPlay, Moon, Sun, Laptop } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';

export default function SystemSettings() {
  const { settings, updateSetting, playNotificationSound } = useSettings();

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title="User Preferences"
        subtitle="Pengaturan preferensi antarmuka pengguna"
        icon={Settings}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
        {/* Tampilan & Skala Layar */}
        <Card className="rounded-xl border-none shadow-xl shadow-slate-100 dark:shadow-none overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 flex items-center gap-4 text-white">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Type className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black">Skala Antarmuka</h3>
              <p className="text-blue-100 text-sm">Ukuran huruf global</p>
            </div>
          </div>
          <CardContent className="p-8">
            <RadioGroup 
              value={settings.fontSize} 
              onValueChange={(val) => updateSetting('fontSize', val)}
              className="space-y-4"
            >
              <div className="flex items-start space-x-4 p-4 border rounded-xl cursor-pointer hover:bg-slate-50 transition-colors dark:hover:bg-slate-800 dark:border-slate-800" onClick={() => updateSetting('fontSize', 'Compact')}>
                <RadioGroupItem value="Compact" id="font-compact" className="mt-1" />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="font-compact" className="font-bold cursor-pointer">Compact (Padat)</Label>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Ukuran font 14px. Cocok untuk layar kecil agar tabel muat lebih banyak data.</p>
                </div>
              </div>
              <div className="flex items-start space-x-4 p-4 border border-blue-200 bg-blue-50/50 rounded-xl cursor-pointer transition-colors dark:border-blue-800 dark:bg-blue-900/30" onClick={() => updateSetting('fontSize', 'Standard')}>
                <RadioGroupItem value="Standard" id="font-standard" className="mt-1" />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="font-standard" className="font-bold cursor-pointer">Standard (Default)</Label>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Ukuran font 16px. Tampilan standar bawaan sistem.</p>
                </div>
              </div>
              <div className="flex items-start space-x-4 p-4 border rounded-xl cursor-pointer hover:bg-slate-50 transition-colors dark:hover:bg-slate-800 dark:border-slate-800" onClick={() => updateSetting('fontSize', 'Comfortable')}>
                <RadioGroupItem value="Comfortable" id="font-comfortable" className="mt-1" />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="font-comfortable" className="font-bold cursor-pointer">Comfortable (Besar)</Label>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Ukuran font 18px. Teks lebih besar dan nyaman untuk dibaca dalam waktu lama.</p>
                </div>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Modal / Jendela Detail */}
        <Card className="rounded-xl border-none shadow-xl shadow-slate-100 dark:shadow-none overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 flex items-center gap-4 text-white">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Maximize className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black">Ukuran Jendela Detail</h3>
              <p className="text-emerald-100 text-sm">Untuk modul AP, AR, dan Invoices</p>
            </div>
          </div>
          <CardContent className="p-8">
            <RadioGroup 
              value={settings.modalSize} 
              onValueChange={(val) => updateSetting('modalSize', val)}
              className="space-y-4"
            >
              <div className="flex items-start space-x-4 p-4 border rounded-xl cursor-pointer hover:bg-slate-50 transition-colors dark:hover:bg-slate-800 dark:border-slate-800" onClick={() => updateSetting('modalSize', 'Standar')}>
                <RadioGroupItem value="Standar" id="modal-standard" className="mt-1" />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="modal-standard" className="font-bold cursor-pointer">Standar</Label>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Kotak dialog ukuran normal di tengah layar (max-w-3xl).</p>
                </div>
              </div>
              <div className="flex items-start space-x-4 p-4 border border-emerald-200 bg-emerald-50/50 rounded-xl cursor-pointer transition-colors dark:border-emerald-800 dark:bg-emerald-900/30" onClick={() => updateSetting('modalSize', 'Lebar')}>
                <RadioGroupItem value="Lebar" id="modal-wide" className="mt-1" />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="modal-wide" className="font-bold cursor-pointer">Sangat Lebar (Direkomendasikan)</Label>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Kotak dialog lebar, cocok untuk rincian pembayaran banyak (max-w-5xl).</p>
                </div>
              </div>
              <div className="flex items-start space-x-4 p-4 border rounded-xl cursor-pointer hover:bg-slate-50 transition-colors dark:hover:bg-slate-800 dark:border-slate-800" onClick={() => updateSetting('modalSize', 'Fullscreen')}>
                <RadioGroupItem value="Fullscreen" id="modal-fullscreen" className="mt-1" />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="modal-fullscreen" className="font-bold cursor-pointer">Layar Penuh (Fullscreen)</Label>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Hampir memenuhi seluruh layar. Menghilangkan kebutuhan drag-to-resize manual.</p>
                </div>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Tema Antarmuka */}
        <Card className="rounded-xl border-none shadow-xl shadow-slate-100 dark:shadow-none overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 flex items-center gap-4 text-white">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Moon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black">Tema Antarmuka</h3>
              <p className="text-indigo-100 text-sm">Pilih mode gelap atau terang</p>
            </div>
          </div>
          <CardContent className="p-8">
            <RadioGroup 
              value={settings.theme || 'light'} 
              onValueChange={(val) => updateSetting('theme', val)}
              className="space-y-4"
            >
              <div className={`flex items-center space-x-4 p-4 border rounded-xl cursor-pointer transition-colors ${settings.theme === 'light' ? 'border-indigo-200 bg-indigo-50/50 shadow-sm dark:border-indigo-800 dark:bg-indigo-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800 dark:border-slate-800'}`} onClick={() => updateSetting('theme', 'light')}>
                <RadioGroupItem value="light" id="theme-light" />
                <div className="flex items-center gap-3 w-full">
                  <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-lg text-slate-600 dark:text-slate-300"><Sun className="w-4 h-4" /></div>
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="theme-light" className="font-bold cursor-pointer">Mode Terang</Label>
                    <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">Tampilan standar Tradixa</p>
                  </div>
                </div>
              </div>
              <div className={`flex items-center space-x-4 p-4 border rounded-xl cursor-pointer transition-colors ${settings.theme === 'dark' ? 'border-indigo-200 bg-indigo-50/50 shadow-sm dark:border-indigo-800 dark:bg-indigo-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800 dark:border-slate-800'}`} onClick={() => updateSetting('theme', 'dark')}>
                <RadioGroupItem value="dark" id="theme-dark" />
                <div className="flex items-center gap-3 w-full">
                  <div className="bg-slate-800 dark:bg-slate-700 p-2 rounded-lg text-slate-200"><Moon className="w-4 h-4" /></div>
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="theme-dark" className="font-bold cursor-pointer">Mode Gelap</Label>
                    <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">Nyaman untuk mata di malam hari</p>
                  </div>
                </div>
              </div>
              <div className={`flex items-center space-x-4 p-4 border rounded-xl cursor-pointer transition-colors ${settings.theme === 'system' ? 'border-indigo-200 bg-indigo-50/50 shadow-sm dark:border-indigo-800 dark:bg-indigo-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800 dark:border-slate-800'}`} onClick={() => updateSetting('theme', 'system')}>
                <RadioGroupItem value="system" id="theme-system" />
                <div className="flex items-center gap-3 w-full">
                  <div className="bg-slate-200 dark:bg-slate-800 p-2 rounded-lg text-slate-600 dark:text-slate-300"><Laptop className="w-4 h-4" /></div>
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="theme-system" className="font-bold cursor-pointer">Sistem Otomatis</Label>
                    <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">Mengikuti pengaturan komputer Anda</p>
                  </div>
                </div>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Notifikasi Suara */}
        <Card className="rounded-xl border-none shadow-xl shadow-slate-100 dark:shadow-none overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 flex items-center justify-between text-white">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                <Volume2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black">Suara Notifikasi</h3>
                <p className="text-amber-100 text-sm">Efek audio untuk aktivitas sistem</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold text-sm">{settings.soundEnabled ? 'Aktif' : 'Nonaktif'}</span>
              <Switch 
                checked={settings.soundEnabled} 
                onCheckedChange={(val) => updateSetting('soundEnabled', val)} 
                className="data-[state=checked]:bg-white data-[state=unchecked]:!bg-white/30 [&>span]:!bg-white [&>span]:data-[state=checked]:!bg-orange-500"
              />
            </div>
          </div>
          <CardContent className="p-8 flex flex-col gap-6 bg-white dark:bg-slate-900">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <p className="text-slate-600 dark:text-slate-300 max-w-xl">
                Nyalakan efek suara "ting" yang subtil ketika pembayaran dikonfirmasi atau peringatan muncul. Sangat berguna agar tidak terlewat informasi penting.
              </p>
              <Button 
                variant="outline" 
                onClick={() => playNotificationSound('success')}
                disabled={!settings.soundEnabled}
                className="gap-2 font-bold h-12 px-6 rounded-xl border-amber-200 text-amber-700 hover:bg-amber-50 whitespace-nowrap"
              >
                <MonitorPlay className="w-4 h-4" />
                Test Suara
              </Button>
            </div>

            {settings.soundEnabled && (
              <div className="pt-6 border-t border-slate-100 space-y-6">
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-4">Jenis Suara</h4>
                  <RadioGroup 
                    value={settings.soundType || 'Modern'} 
                    onValueChange={(val) => {
                      updateSetting('soundType', val);
                      playNotificationSound('success', val);
                    }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4"
                  >
                    <div className={`flex items-center space-x-3 p-4 border rounded-xl cursor-pointer transition-all ${settings.soundType === 'Modern' || !settings.soundType ? 'border-amber-200 bg-amber-50/50 shadow-sm dark:border-amber-800 dark:bg-amber-900/30' : 'hover:bg-slate-50'}`} onClick={() => { updateSetting('soundType', 'Modern'); playNotificationSound('success', 'Modern'); }}>
                      <RadioGroupItem value="Modern" id="type-modern" />
                      <div className="cursor-pointer">
                        <Label htmlFor="type-modern" className="font-bold text-slate-800 dark:text-slate-200 cursor-pointer block">Modern Pop</Label>
                        <span className="text-xs text-slate-500 dark:text-slate-400">Suara modern dan elegan</span>
                      </div>
                    </div>
                    <div className={`flex items-center space-x-3 p-4 border rounded-xl cursor-pointer transition-all ${settings.soundType === 'Soft' ? 'border-amber-200 bg-amber-50/50 shadow-sm dark:border-amber-800 dark:bg-amber-900/30' : 'hover:bg-slate-50'}`} onClick={() => { updateSetting('soundType', 'Soft'); playNotificationSound('success', 'Soft'); }}>
                      <RadioGroupItem value="Soft" id="type-soft" />
                      <div className="cursor-pointer">
                        <Label htmlFor="type-soft" className="font-bold text-slate-800 dark:text-slate-200 cursor-pointer block">Soft Chime</Label>
                        <span className="text-xs text-slate-500 dark:text-slate-400">Bunyi bel yang lembut</span>
                      </div>
                    </div>
                    <div className={`flex items-center space-x-3 p-4 border rounded-xl cursor-pointer transition-all ${settings.soundType === 'Classic' ? 'border-amber-200 bg-amber-50/50 shadow-sm dark:border-amber-800 dark:bg-amber-900/30' : 'hover:bg-slate-50'}`} onClick={() => { updateSetting('soundType', 'Classic'); playNotificationSound('success', 'Classic'); }}>
                      <RadioGroupItem value="Classic" id="type-classic" />
                      <div className="cursor-pointer">
                        <Label htmlFor="type-classic" className="font-bold text-slate-800 dark:text-slate-200 cursor-pointer block">Classic Retro</Label>
                        <span className="text-xs text-slate-500 dark:text-slate-400">Gaya klasik 8-bit</span>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-4">Volume Suara</h4>
                  <RadioGroup 
                    value={settings.soundVolume || 'Sedang'} 
                    onValueChange={(val) => {
                      updateSetting('soundVolume', val);
                      setTimeout(() => playNotificationSound('success'), 100);
                    }}
                    className="grid grid-cols-3 gap-4"
                  >
                    <div className={`flex items-center space-x-3 p-3 border rounded-xl cursor-pointer transition-colors ${settings.soundVolume === 'Kecil' ? 'border-amber-200 bg-amber-50/50' : 'hover:bg-slate-50'}`} onClick={() => { updateSetting('soundVolume', 'Kecil'); setTimeout(() => playNotificationSound('success'), 100); }}>
                      <RadioGroupItem value="Kecil" id="vol-kecil" />
                      <Label htmlFor="vol-kecil" className="font-medium cursor-pointer">Kecil</Label>
                    </div>
                    <div className={`flex items-center space-x-3 p-3 border rounded-xl cursor-pointer transition-colors ${settings.soundVolume === 'Sedang' ? 'border-amber-200 bg-amber-50/50' : 'hover:bg-slate-50'}`} onClick={() => { updateSetting('soundVolume', 'Sedang'); setTimeout(() => playNotificationSound('success'), 100); }}>
                      <RadioGroupItem value="Sedang" id="vol-sedang" />
                      <Label htmlFor="vol-sedang" className="font-medium cursor-pointer">Sedang</Label>
                    </div>
                    <div className={`flex items-center space-x-3 p-3 border rounded-xl cursor-pointer transition-colors ${settings.soundVolume === 'Maksimal' ? 'border-amber-200 bg-amber-50/50' : 'hover:bg-slate-50'}`} onClick={() => { updateSetting('soundVolume', 'Maksimal'); setTimeout(() => playNotificationSound('success'), 100); }}>
                      <RadioGroupItem value="Maksimal" id="vol-maks" />
                      <Label htmlFor="vol-maks" className="font-medium cursor-pointer">Maksimal</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

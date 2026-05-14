import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, Award, Gift, Users, TrendingUp, Trophy, Info, Printer, FileText, FileSpreadsheet } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import { exportToPDF, exportToExcel } from '@/components/layout/ExportToolbar';
import PremiumGate from '@/components/ui/PremiumGate';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export default function LoyaltyProgram({ store }) {
  const [tiers, setTiers] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [showTierForm, setShowTierForm] = useState(false);
  const [showRewardForm, setShowRewardForm] = useState(false);
  const [editingTier, setEditingTier] = useState(null);
  const [editingReward, setEditingReward] = useState(null);
  const [tierForm, setTierForm] = useState({ tier_name: '', min_points: '', discount_percentage: 0, points_multiplier: 1, benefits: '', tier_color: '#94a3b8' });
  const [rewardForm, setRewardForm] = useState({ reward_name: '', description: '', points_required: '', reward_type: 'Discount', reward_value: '', stock_quantity: 0, expiry_days: 30 });

  useEffect(() => {
    if (store?.id) loadData();
  }, [store]);

  const loadData = async () => {
    const [tierData, rewardData, custData] = await Promise.all([
      api.entities.LoyaltyTier.filter({ store_id: store.id }),
      api.entities.LoyaltyReward.filter({ store_id: store.id }),
      api.entities.CustomerLoyalty.filter({ store_id: store.id })
    ]);
    setTiers(tierData.sort((a, b) => a.min_points - b.min_points));
    setRewards(rewardData);
    setCustomers(custData);
  };

  const handleTierSubmit = async (e) => {
    e.preventDefault();
    const data = { store_id: store.id, ...tierForm, min_points: Number(tierForm.min_points), discount_percentage: Number(tierForm.discount_percentage), points_multiplier: Number(tierForm.points_multiplier) };
    editingTier ? await api.entities.LoyaltyTier.update(editingTier.id, data) : await api.entities.LoyaltyTier.create(data);
    setShowTierForm(false);
    setEditingTier(null);
    setTierForm({ tier_name: '', min_points: '', discount_percentage: 0, points_multiplier: 1, benefits: '', tier_color: '#94a3b8' });
    loadData();
  };

  const handleRewardSubmit = async (e) => {
    e.preventDefault();
    const data = { store_id: store.id, ...rewardForm, points_required: Number(rewardForm.points_required), reward_value: Number(rewardForm.reward_value), stock_quantity: Number(rewardForm.stock_quantity), expiry_days: Number(rewardForm.expiry_days) };
    editingReward ? await api.entities.LoyaltyReward.update(editingReward.id, data) : await api.entities.LoyaltyReward.create(data);
    setShowRewardForm(false);
    setEditingReward(null);
    setRewardForm({ reward_name: '', description: '', points_required: '', reward_type: 'Discount', reward_value: '', stock_quantity: 0, expiry_days: 30 });
    loadData();
  };

  const handleDeleteTier = async (id) => {
    if (confirm('Hapus tier ini?')) { await api.entities.LoyaltyTier.delete(id); loadData(); }
  };

  const handleDeleteReward = async (id) => {
    if (confirm('Hapus reward ini?')) { await api.entities.LoyaltyReward.delete(id); loadData(); }
  };

  const totalCustomers = customers.length;
  const activeMembers = customers.filter(c => c.total_points > 0).length;
  const totalPointsIssued = customers.reduce((sum, c) => sum + c.points_earned, 0);

  const LabelWithInfo = ({ label, info }) => (
    <div className="flex items-center gap-1.5 mb-1.5">
      <Label>{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className="inline-flex items-center justify-center outline-none">
            <Info className="w-3.5 h-3.5 text-slate-400 hover:text-blue-500 cursor-pointer transition-colors" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[240px] p-3 bg-slate-900 text-white border-none shadow-2xl rounded-xl animate-in fade-in zoom-in duration-200">
          <p className="text-[11px] leading-relaxed opacity-90">{info}</p>
        </PopoverContent>
      </Popover>
    </div>
  );

  return (
    <div className="space-y-6" id="print-loyalty-program">
      <PageHeader
        title={
          <div className="flex items-center gap-2">
            Loyalty Program
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-blue-50 hover:bg-blue-100 border border-blue-100 shadow-sm transition-all duration-300 group">
                  <Info className="w-4 h-4 text-blue-600 group-hover:scale-110" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[340px] p-0 overflow-hidden shadow-2xl border-blue-100 rounded-2xl animate-in fade-in zoom-in duration-200">
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-4 text-white">
                  <div className="flex items-center gap-2 mb-1">
                    <Award className="w-5 h-5 text-blue-200" />
                    <h3 className="font-bold text-base">Panduan Loyalty Program</h3>
                  </div>
                  <p className="text-xs text-blue-100 opacity-90">Bangun kesetiaan pelanggan dengan sistem reward otomatis.</p>
                </div>
                <div className="p-4 space-y-4 bg-white">
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                        <Trophy className="w-3.5 h-3.5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Sistem Tiering</p>
                        <p className="text-[11px] text-slate-500 leading-relaxed">Level member (Bronze/Gold dll) ditentukan berdasarkan akumulasi poin belanja pelanggan.</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Pengali Poin</p>
                        <p className="text-[11px] text-slate-500 leading-relaxed">Makin tinggi tier, makin besar pengali poinnya. Contoh: Tier Gold dapat 2 poin untuk setiap Rp 1.000.</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-lg bg-rose-50 flex items-center justify-center flex-shrink-0">
                        <Gift className="w-3.5 h-3.5 text-rose-600" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Katalog Reward</p>
                        <p className="text-[11px] text-slate-500 leading-relaxed">Poin yang dikumpulkan dapat ditukarkan dengan hadiah, voucher, atau produk di katalog.</p>
                      </div>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                    <Info className="w-3.5 h-3.5 text-blue-500" />
                    <p className="text-[10px] text-slate-400 italic">Poin dihitung otomatis setiap transaksi penjualan selesai.</p>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        }
        actions={
          <div className="flex flex-wrap lg:flex-nowrap gap-2 items-center">
            <div className="flex items-center gap-1.5 mr-2">
              <PremiumGate store={store} featureName="Print">
                <Button variant="outline" size="sm" onClick={() => exportToPDF('Loyalty Program', new Date().toLocaleDateString('id-ID'), store?.store_name, store?.address, store?.logo_url, 'print-loyalty-program')} className="gap-1.5 text-slate-600 border-slate-200 hover:bg-slate-50 text-xs h-11 px-3 rounded-xl">
                  <Printer className="w-4 h-4" /><span className="hidden sm:inline">Print</span>
                </Button>
              </PremiumGate>
              <PremiumGate store={store} featureName="Export PDF">
                <Button variant="outline" size="sm" onClick={() => exportToPDF('Loyalty Program', new Date().toLocaleDateString('id-ID'), store?.store_name, store?.address, store?.logo_url, 'print-loyalty-program')} className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50 text-xs h-11 px-3 rounded-xl">
                  <FileText className="w-4 h-4" /><span className="hidden sm:inline">PDF</span>
                </Button>
              </PremiumGate>
              <PremiumGate store={store} featureName="Export Excel">
                <Button variant="outline" size="sm" onClick={() => exportToExcel('Loyalty Program', new Date().toLocaleDateString('id-ID'), store?.store_name, store?.address, 'print-loyalty-program')} className="gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50 text-xs h-11 px-3 rounded-xl">
                  <FileSpreadsheet className="w-4 h-4" /><span className="hidden sm:inline">Excel</span>
                </Button>
              </PremiumGate>
            </div>
          </div>
        }
        subtitle="Kelola tier, reward, dan member loyalitas"
        icon={Award}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm bg-white/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-base font-medium text-slate-500 mb-1">Total Member</p>
                <p className="text-2xl font-black text-slate-900">{totalCustomers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-base font-medium text-slate-500 mb-1">Member Aktif</p>
                <p className="text-2xl font-black text-slate-900">{activeMembers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center">
                <Award className="w-6 h-6 text-violet-600" />
              </div>
              <div>
                <p className="text-base font-medium text-slate-500 mb-1">Poin Diterbitkan</p>
                <p className="text-2xl font-black text-slate-900">{totalPointsIssued.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tiers" className="space-y-4">
        <TabsList className="bg-slate-100/50 p-1 rounded-xl">
          <TabsTrigger value="tiers" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Tier Loyalitas</TabsTrigger>
          <TabsTrigger value="rewards" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Katalog Reward</TabsTrigger>
          <TabsTrigger value="members" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Daftar Member</TabsTrigger>
        </TabsList>

        <TabsContent value="tiers" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditingTier(null); setShowTierForm(true); }} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />Tambah Tier
            </Button>
          </div>
          <Card className="border-none shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    <TableHead className="w-12 text-center">No.</TableHead>
                    <TableHead >Tier</TableHead>
                    <TableHead >Min. Poin</TableHead>
                    <TableHead >Diskon</TableHead>
                    <TableHead >Pengali Poin</TableHead>
                    <TableHead >Benefits</TableHead>
                    <TableHead className="text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tiers.map((tier, idx) => (
                    <TableRow key={tier.id} className="hover:bg-slate-50/30 transition-colors">
                      <TableCell className="text-center text-slate-500 font-medium">{idx + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm" style={{ backgroundColor: tier.tier_color + '20' }}>
                            <Trophy className="w-4 h-4" style={{ color: tier.tier_color }} />
                          </div>
                          <span className="font-bold text-slate-700">{tier.tier_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-slate-600">{tier.min_points.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-rose-50 text-rose-600 border-none font-bold">
                          {tier.discount_percentage}% OFF
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-none font-bold">
                          {tier.points_multiplier}x Poin
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs text-xs text-slate-500 italic">{tier.benefits}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600" onClick={() => { setEditingTier(tier); setTierForm(tier); setShowTierForm(true); }}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-rose-50 hover:text-rose-600" onClick={() => handleDeleteTier(tier.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rewards" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditingReward(null); setShowRewardForm(true); }} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />Tambah Reward
            </Button>
          </div>
          <Card className="border-none shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    <TableHead className="w-12 text-center">No.</TableHead>
                    <TableHead >Reward</TableHead>
                    <TableHead >Tipe</TableHead>
                    <TableHead >Poin Dibutuhkan</TableHead>
                    <TableHead >Nilai</TableHead>
                    <TableHead >Stok</TableHead>
                    <TableHead >Status</TableHead>
                    <TableHead className="text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rewards.map((reward, idx) => (
                    <TableRow key={reward.id} className="hover:bg-slate-50/30 transition-colors">
                      <TableCell className="text-center text-slate-500 font-medium">{idx + 1}</TableCell>
                      <TableCell className="font-bold text-slate-700">{reward.reward_name}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px] uppercase tracking-tighter">{reward.reward_type}</Badge></TableCell>
                      <TableCell className="font-black text-rose-600">{reward.points_required.toLocaleString()} Pts</TableCell>
                      <TableCell className="font-medium text-slate-600">{reward.reward_value}</TableCell>
                      <TableCell>{reward.stock_quantity || 'Unlimited'}</TableCell>
                      <TableCell>
                        <Badge className={reward.is_active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none' : 'bg-slate-100 text-slate-700 border-none'}>
                          {reward.is_active ? 'Aktif' : 'Tidak Aktif'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-blue-50" onClick={() => { setEditingReward(reward); setRewardForm(reward); setShowRewardForm(true); }}>
                            <Edit className="w-4 h-4 text-slate-500" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-rose-50" onClick={() => handleDeleteReward(reward.id)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          <Card className="border-none shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    <TableHead className="w-12 text-center">No.</TableHead>
                    <TableHead >Nama Customer</TableHead>
                    <TableHead >Tier</TableHead>
                    <TableHead className="text-right">Saldo Poin</TableHead>
                    <TableHead className="text-right">Total Belanja</TableHead>
                    <TableHead className="text-right">Poin Masuk</TableHead>
                    <TableHead className="text-right">Poin Keluar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((cust, idx) => (
                    <TableRow key={cust.id} className="hover:bg-slate-50/30 transition-colors">
                      <TableCell className="text-center text-slate-500 font-medium">{idx + 1}</TableCell>
                      <TableCell className="font-bold text-slate-700">{cust.customer_name || 'Tanpa Nama'}</TableCell>
                      <TableCell>
                        <Badge className="bg-blue-600 border-none shadow-sm px-3">{cust.current_tier || 'Bronze'}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-black text-rose-600 text-lg">{(cust.total_points || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-medium text-slate-600">Rp {(cust.lifetime_spending || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-emerald-600 font-bold">+{(cust.points_earned || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-rose-400">-{(cust.points_redeemed || 0).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Tier Form Dialog */}
      <Dialog open={showTierForm} onOpenChange={setShowTierForm}>
        <DialogContent className="sm:max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-800">{editingTier ? 'Edit Tier' : 'Tambah Tier Baru'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTierSubmit} className="space-y-4 mt-4">
            <div>
              <LabelWithInfo label="Nama Tier" info="Berikan nama level member (Contoh: Silver, Gold, VIP)." />
              <Input className="rounded-xl border-slate-200 focus:ring-blue-500" value={tierForm.tier_name} onChange={(e) => setTierForm({...tierForm, tier_name: e.target.value})} required placeholder="Masukkan nama tier..." />
            </div>
            <div>
              <LabelWithInfo label="Minimum Poin" info="Jumlah poin minimal yang harus dimiliki pelanggan untuk masuk ke tier ini." />
              <Input className="rounded-xl border-slate-200" type="number" value={tierForm.min_points} onChange={(e) => setTierForm({...tierForm, min_points: e.target.value})} required placeholder="Contoh: 1000" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <LabelWithInfo label="Diskon (%)" info="Potongan harga otomatis bagi member tier ini setiap kali belanja." />
                <Input className="rounded-xl border-slate-200" type="number" value={tierForm.discount_percentage} onChange={(e) => setTierForm({...tierForm, discount_percentage: e.target.value})} />
              </div>
              <div>
                <LabelWithInfo label="Pengali Poin" info="Bonus pengali poin. Contoh: Isi 2 agar member tier ini dapat 2 poin untuk setiap Rp 1.000 belanja." />
                <Input className="rounded-xl border-slate-200" type="number" step="0.1" value={tierForm.points_multiplier} onChange={(e) => setTierForm({...tierForm, points_multiplier: e.target.value})} />
              </div>
            </div>
            <div>
              <LabelWithInfo label="Benefits" info="Tuliskan keuntungan lain secara singkat (Contoh: Gratis Ongkir, Akses VIP)." />
              <Input className="rounded-xl border-slate-200" value={tierForm.benefits} onChange={(e) => setTierForm({...tierForm, benefits: e.target.value})} placeholder="Keuntungan tambahan..." />
            </div>
            <div>
              <LabelWithInfo label="Warna Tier" info="Pilih warna identitas untuk tier ini agar mudah dibedakan di dashboard." />
              <div className="flex gap-3 items-center">
                <Input type="color" className="h-10 w-20 p-1 rounded-lg" value={tierForm.tier_color} onChange={(e) => setTierForm({...tierForm, tier_color: e.target.value})} />
                <span className="text-xs text-slate-500 italic">Klik kotak untuk memilih warna</span>
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setShowTierForm(false)} className="rounded-xl">Batal</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 rounded-xl px-8">Simpan Tier</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reward Form Dialog */}
      <Dialog open={showRewardForm} onOpenChange={setShowRewardForm}>
        <DialogContent className="sm:max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-800">{editingReward ? 'Edit Reward' : 'Tambah Reward Baru'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRewardSubmit} className="space-y-4">
            <div>
              <LabelWithInfo label="Nama Reward *" info="Berikan nama reward yang menarik (Contoh: Voucher Diskon 10rb)." />
              <Input className="rounded-xl border-slate-200" value={rewardForm.reward_name} onChange={(e) => setRewardForm({...rewardForm, reward_name: e.target.value})} required placeholder="Nama reward..." />
            </div>
            <div>
              <LabelWithInfo label="Deskripsi" info="Jelaskan detail reward atau syarat penggunaannya secara singkat." />
              <Input className="rounded-xl border-slate-200" value={rewardForm.description} onChange={(e) => setRewardForm({...rewardForm, description: e.target.value})} placeholder="Penjelasan reward..." />
            </div>
            <div>
              <LabelWithInfo label="Tipe Reward" info="Pilih kategori reward. Diskon memotong harga, Produk Gratis memberikan item fisik." />
              <Select value={rewardForm.reward_type} onValueChange={(v) => setRewardForm({...rewardForm, reward_type: v})}>
                <SelectTrigger className="rounded-xl border-slate-200"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="Discount">Diskon</SelectItem>
                  <SelectItem value="Free Product">Produk Gratis</SelectItem>
                  <SelectItem value="Cashback">Cashback</SelectItem>
                  <SelectItem value="Voucher">Voucher</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <LabelWithInfo label="Poin Dibutuhkan *" info="Jumlah poin yang harus ditukarkan pelanggan untuk mendapatkan reward ini." />
              <Input className="rounded-xl border-slate-200" type="number" value={rewardForm.points_required} onChange={(e) => setRewardForm({...rewardForm, points_required: e.target.value})} required placeholder="Contoh: 500" />
            </div>
            <div>
              <LabelWithInfo label="Nilai Reward" info="Nilai nominal. Contoh: 10000 untuk voucher 10rb, atau 10 untuk diskon 10%." />
              <Input className="rounded-xl border-slate-200" type="number" value={rewardForm.reward_value} onChange={(e) => setRewardForm({...rewardForm, reward_value: e.target.value})} placeholder="Besaran nilai..." />
            </div>
            <div>
              <LabelWithInfo label="Stok (0 = Unlimited)" info="Batasi jumlah reward yang tersedia. Isi 0 jika reward selalu tersedia." />
              <Input className="rounded-xl border-slate-200" type="number" value={rewardForm.stock_quantity} onChange={(e) => setRewardForm({...rewardForm, stock_quantity: e.target.value})} />
            </div>
            <div>
              <LabelWithInfo label="Berlaku (hari)" info="Masa aktif reward setelah ditukarkan oleh pelanggan (Contoh: 30 hari)." />
              <Input className="rounded-xl border-slate-200" type="number" value={rewardForm.expiry_days} onChange={(e) => setRewardForm({...rewardForm, expiry_days: e.target.value})} />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setShowRewardForm(false)} className="rounded-xl">Batal</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 rounded-xl px-8">Simpan Reward</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

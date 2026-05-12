import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, User, ShoppingCart, MessageSquare, Bell, Plus, Mail, Phone, Calendar, Loader2, CheckCircle2, Clock, AlertCircle, BadgePercent, Eye, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import moment from 'moment';
import ExportToolbar from '@/components/layout/ExportToolbar';

export default function CustomerProfile({ store }) {
  const urlParams = new URLSearchParams(window.location.search);
  const customerId = urlParams.get('id');

  const [customer, setCustomer] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [receivables, setReceivables] = useState([]);
  const [communications, setCommunications] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [loyaltyInfo, setLoyaltyInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCommDialog, setShowCommDialog] = useState(false);
  const [showReminderDialog, setShowReminderDialog] = useState(false);
   const [isSaving, setIsSaving] = useState(false);
   const [viewingDiscount, setViewingDiscount] = useState(null);

  const [commForm, setCommForm] = useState({
    communication_type: 'Note',
    subject: '',
    content: ''
  });

  const [reminderForm, setReminderForm] = useState({
    title: '',
    description: '',
    due_date: moment().format('YYYY-MM-DD'),
    priority: 'Medium',
    remind_days_before: 0
  });

  useEffect(() => {
    if (store?.id && customerId) loadData();
  }, [store, customerId]);

  const loadData = async () => {
    const [customerData, transactionsData, receivablesData, commsData, remindersData, interactionData, loyalData] = await Promise.all([
      api.entities.Customer.filter({ id: customerId, store_id: store.id }),
      api.entities.SalesTransaction.filter({ store_id: store.id, customer_id: customerId }),
      api.entities.Receivable.filter({ store_id: store.id, customer_id: customerId }),
      api.entities.CommunicationLog.filter({ store_id: store.id, customer_id: customerId }),
      api.entities.FollowUpReminder.filter({ store_id: store.id, customer_id: customerId }),
      api.entities.CustomerInteraction.filter({ store_id: store.id, customer_id: customerId }),
      api.entities.CustomerLoyalty.filter({ store_id: store.id, customer_id: customerId })
    ]);

    setCustomer(customerData[0]);
    setTransactions(transactionsData || []);
    setReceivables(receivablesData || []);
    setCommunications(commsData || []);
    setReminders(remindersData || []);
    setInteractions(interactionData || []);
    setLoyaltyInfo(loyalData[0] || null);
    setIsLoading(false);
  };

  const formatCurrency = (value) => new Intl.NumberFormat('id-ID').format(value || 0);

  const handleAddCommunication = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    await api.entities.CommunicationLog.create({
      store_id: store.id,
      customer_id: customerId,
      customer_name: customer.name,
      ...commForm,
      timestamp_wib: moment().utcOffset(7).format('YYYY-MM-DD HH:mm:ss')
    });

    setCommForm({ communication_type: 'Note', subject: '', content: '' });
    setShowCommDialog(false);
    setIsSaving(false);
    loadData();
  };

  const handleAddReminder = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    await api.entities.FollowUpReminder.create({
      store_id: store.id,
      customer_id: customerId,
      customer_name: customer.name,
      ...reminderForm
    });

    setReminderForm({ title: '', description: '', due_date: moment().format('YYYY-MM-DD'), priority: 'Medium', remind_days_before: 0 });
    setShowReminderDialog(false);
    setIsSaving(false);
    loadData();
  };

  const handleCompleteReminder = async (reminderId) => {
    await api.entities.FollowUpReminder.update(reminderId, { status: 'Completed' });
    loadData();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Customer not found</p>
        <Link to={createPageUrl('CustomerMaster')}>
          <Button className="mt-4">Back to Customers</Button>
        </Link>
      </div>
    );
  }

  const totalSpent = transactions.reduce((sum, t) => sum + (t.total || 0), 0);
  const totalOrders = transactions.length;
  const avgOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
  const totalReceivables = receivables
    .filter(r => r.status !== 'Lunas')
    .reduce((sum, r) => sum + (r.remaining_amount || 0), 0);
  const discountTransactions = transactions.filter(t => (t.discount || 0) > 0);
  const pendingReminders = reminders.filter(r => r.status === 'Pending').length;

  return (
    <div className="space-y-4 md:space-y-6 px-2 md:px-0">
      <div className="flex items-center gap-3">
        <Link to={createPageUrl('CustomerMaster')}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800">Customer Profile</h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">Complete customer relationship management</p>
        </div>
        <ExportToolbar 
          title={`Profil Pelanggan - ${customer?.name}`} 
          date={moment().format('DD MMMM YYYY')} 
          storeName={store?.store_name} 
          storeAddress={store?.address} 
          storeLogoUrl={store?.logo_url} 
          contentId="print-customer-detailed" 
        />
      </div>

      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row gap-4 md:gap-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden border-2 border-white shadow-sm">
              {customer.photo_url ? (
                <img src={customer.photo_url} alt={customer.name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-white" />
              )}
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-slate-900">{customer.name}</h2>
                <div className="flex flex-wrap gap-3 mt-2 text-sm text-slate-600">
                  {customer.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      {customer.phone}
                    </div>
                  )}
                  {customer.email && (
                    <div className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      {customer.email}
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Total Spent</p>
                  <p className="text-lg font-bold text-blue-600">Rp {formatCurrency(totalSpent)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Sisa Piutang</p>
                  <p className="text-lg font-bold text-red-600">Rp {formatCurrency(totalReceivables)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total Orders</p>
                  <p className="text-lg font-bold text-slate-900">{totalOrders}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Loyalty Tier</p>
                  <Badge className="text-sm bg-amber-100 text-amber-700 border-amber-200">{loyaltyInfo?.current_tier || 'Bronze'}</Badge>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Loyalty Points</p>
                  <p className="text-lg font-bold text-amber-600">{loyaltyInfo?.total_points || 0}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 mb-4 h-auto">
          <TabsTrigger value="overview" className="text-xs py-2">
            <User className="w-4 h-4 mr-1 md:mr-2" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="purchases" className="text-xs py-2">
            <ShoppingCart className="w-4 h-4 mr-1 md:mr-2" />
            <span>Purchases</span>
          </TabsTrigger>
          <TabsTrigger value="discounts" className="text-xs py-2 text-rose-600">
            <BadgePercent className="w-4 h-4 mr-1 md:mr-2" />
            <span>Discounts</span>
          </TabsTrigger>
          <TabsTrigger value="interactions" className="text-xs py-2">
            <Mail className="w-4 h-4 mr-1 md:mr-2" />
            <span className="hidden md:inline">Activity</span>
            <span className="md:hidden">Act</span>
          </TabsTrigger>
          <TabsTrigger value="communications" className="text-xs py-2">
            <MessageSquare className="w-4 h-4 mr-1 md:mr-2" />
            <span className="hidden md:inline">Comms</span>
            <span className="md:hidden">Msg</span>
          </TabsTrigger>
          <TabsTrigger value="reminders" className="text-xs py-2">
            <Bell className="w-4 h-4 mr-1 md:mr-2" />
            <span>Tasks</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg">Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <Label>Address</Label>
                  <p className="text-sm font-medium">{customer.address || '-'}</p>
                </div>
                <div>
                  <Label>Bank Account</Label>
                  <p className="text-sm font-medium">{customer.bank_name ? `${customer.bank_name} - ${customer.bank_account}` : '-'}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <Badge className={customer.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}>
                    {customer.status}
                  </Badge>
                </div>
                <div>
                  <Label>Customer Since</Label>
                  <p className="text-sm font-medium">{moment(customer.created_date).format('DD MMM YYYY')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {transactions.slice(0, 3).map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{t.invoice_number}</p>
                      <p className="text-xs text-slate-500">{t.timestamp_wib || moment(t.created_date).format('DD MMM YYYY, HH:mm')}</p>
                    </div>
                    <p className="text-sm font-bold text-blue-600">Rp {formatCurrency(t.total)}</p>
                  </div>
                ))}
                {transactions.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-4">No transactions yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchases" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg">Purchase History ({totalOrders} orders)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead >Invoice</TableHead>
                      <TableHead >Date</TableHead>
                      <TableHead >Items</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead >Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="text-sm font-medium">{t.invoice_number}</TableCell>
                        <TableCell className="text-sm">{t.timestamp_wib || moment(t.created_date).format('DD MMM YYYY, HH:mm')}</TableCell>
                        <TableCell className="text-sm">{t.items?.length || 0} items</TableCell>
                        <TableCell className="text-sm text-right font-semibold">Rp {formatCurrency(t.total)}</TableCell>
                        <TableCell>
                          <Badge className={t.payment_status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                            {t.payment_status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {transactions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                          No purchase history
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="discounts" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base md:text-lg">Riwayat Potongan Harga / Diskon</CardTitle>
              <BadgePercent className="w-5 h-5 text-rose-500" />
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                      <TableRow className="bg-rose-50/50">
                        <TableHead >Invoice</TableHead>
                        <TableHead >Tanggal</TableHead>
                        <TableHead className="text-right">Total Transaksi</TableHead>
                        <TableHead className="text-right">Potongan (Rp)</TableHead>
                        <TableHead className="text-right text-rose-600">%</TableHead>
                        <TableHead className="text-center">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                  <TableBody>
                    {discountTransactions.map((t) => {
                      const discountPercent = ((t.discount || 0) / ((t.total || 0) + (t.discount || 0)) * 100).toFixed(1);
                      return (
                        <TableRow key={t.id}>
                          <TableCell className="text-sm font-medium">{t.invoice_number}</TableCell>
                          <TableCell className="text-sm">{t.timestamp_wib || moment(t.created_date).format('DD MMM YYYY, HH:mm')}</TableCell>
                          <TableCell className="text-right text-sm font-semibold">Rp {formatCurrency(t.total)}</TableCell>
                          <TableCell className="text-right text-sm font-bold text-rose-600">Rp {formatCurrency(t.discount)}</TableCell>
                          <TableCell className="text-right text-sm">
                            <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">
                              {discountPercent}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0" 
                              onClick={() => setViewingDiscount(t)}
                            >
                              <Eye className="w-4 h-4 text-slate-400 hover:text-rose-600" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {discountTransactions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-slate-500 italic">
                          Belum ada riwayat diskon untuk pelanggan ini.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg">Marketing Interactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {interactions.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <Mail className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="text-sm">No marketing interactions yet</p>
                  </div>
                ) : (
                  interactions.map((interaction) => (
                    <div key={interaction.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        interaction.interaction_type === 'Email Opened' ? 'bg-emerald-500' :
                        interaction.interaction_type === 'Link Clicked' ? 'bg-blue-500' :
                        interaction.interaction_type?.includes('Sent') ? 'bg-amber-500' :
                        'bg-slate-400'
                      }`}></div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">{interaction.interaction_type}</Badge>
                          <span className="text-xs text-slate-500">
                            {moment(interaction.created_date).format('DD MMM YYYY, HH:mm')}
                          </span>
                        </div>
                        {interaction.campaign_name && (
                          <p className="text-sm font-medium text-slate-700">Kampanye: {interaction.campaign_name}</p>
                        )}
                        {interaction.metadata?.link && (
                          <p className="text-xs text-blue-600 truncate">Link: {interaction.metadata.link}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="communications" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowCommDialog(true)} className="text-sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Communication
            </Button>
          </div>

          <Card>
            <CardContent className="p-4 space-y-3">
              {communications.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm">No communications logged yet</p>
                </div>
              ) : (
                communications.map((comm) => (
                  <div key={comm.id} className="p-4 bg-slate-50 rounded-lg space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">{comm.communication_type}</Badge>
                          <span className="text-xs text-slate-500">
                            {moment(comm.created_date).format('DD MMM YYYY, HH:mm')}
                          </span>
                        </div>
                        {comm.subject && (
                          <p className="text-sm font-semibold text-slate-900 mb-1">{comm.subject}</p>
                        )}
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{comm.content}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reminders" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowReminderDialog(true)} className="text-sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Reminder
            </Button>
          </div>

          <Card>
            <CardContent className="p-4 space-y-3">
              {reminders.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Bell className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm">No reminders set</p>
                </div>
              ) : (
                reminders.map((reminder) => (
                  <div key={reminder.id} className={`p-4 rounded-lg border-l-4 ${
                    reminder.status === 'Completed' ? 'bg-green-50 border-green-500' :
                    reminder.priority === 'High' ? 'bg-red-50 border-red-500' :
                    reminder.priority === 'Medium' ? 'bg-yellow-50 border-yellow-500' :
                    'bg-blue-50 border-blue-500'
                  }`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">{reminder.title}</p>
                          <Badge variant="outline" className="text-xs">{reminder.priority}</Badge>
                          {reminder.status === 'Completed' && (
                            <Badge className="bg-green-100 text-green-700 text-xs">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Completed
                            </Badge>
                          )}
                        </div>
                        {reminder.description && (
                          <p className="text-sm text-slate-700">{reminder.description}</p>
                        )}
                        <div className="flex items-center gap-1 text-xs text-slate-600">
                          <Calendar className="w-3 h-3" />
                          Due: {moment(reminder.due_date).format('DD MMM YYYY')}
                          {moment(reminder.due_date).isBefore(moment(), 'day') && reminder.status === 'Pending' && (
                            <Badge className="bg-red-100 text-red-700 text-xs ml-2">Overdue</Badge>
                          )}
                        </div>
                      </div>
                      {reminder.status === 'Pending' && (
                        <Button
                          size="sm"
                          onClick={() => handleCompleteReminder(reminder.id)}
                          className="text-xs"
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Complete
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showCommDialog} onOpenChange={setShowCommDialog}>
        <DialogContent className="w-[95vw] max-w-2xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-lg">Add Communication Log</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddCommunication} className="space-y-3">
            <div>
              <Label>Type</Label>
              <Select value={commForm.communication_type} onValueChange={(v) => setCommForm({...commForm, communication_type: v})}>
                <SelectTrigger className="mt-1 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Note">Note</SelectItem>
                  <SelectItem value="Email">Email</SelectItem>
                  <SelectItem value="Call">Phone Call</SelectItem>
                  <SelectItem value="Meeting">Meeting</SelectItem>
                  <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Subject (Optional)</Label>
              <Input
                value={commForm.subject}
                onChange={(e) => setCommForm({...commForm, subject: e.target.value})}
                placeholder="Brief summary"
                className="mt-1 text-sm"
              />
            </div>
            <div>
              <Label>Content *</Label>
              <Textarea
                value={commForm.content}
                onChange={(e) => setCommForm({...commForm, content: e.target.value})}
                placeholder="Details of the communication..."
                rows={4}
                className="mt-1 text-sm"
                required
              />
            </div>
            <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={() => setShowCommDialog(false)} className="text-sm">
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} className="text-sm">
                {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingDiscount} onOpenChange={() => setViewingDiscount(null)}>
        <DialogContent className="w-[95vw] max-w-2xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BadgePercent className="w-5 h-5 text-rose-500" />
              Detail Potongan Harga
            </DialogTitle>
          </DialogHeader>
          
          {viewingDiscount ? (
            <div className="space-y-4">
              <div className="flex justify-between items-start border-b pb-3">
                <div>
                  <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Invoice</p>
                  <p className="font-bold text-slate-900">{viewingDiscount.invoice_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Tanggal</p>
                  <p className="text-sm text-slate-600">{viewingDiscount.timestamp_wib || moment(viewingDiscount.created_date).format('DD MMM YYYY')}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Item Transaksi</p>
                <div className="bg-slate-50 rounded-lg p-3 space-y-2 max-h-[150px] overflow-y-auto">
                  {(viewingDiscount.items || []).map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-slate-600 truncate mr-2">{item.product_name || 'Produk'} x{item.quantity}</span>
                      <span className="font-medium text-slate-800">Rp {formatCurrency(item.subtotal || (item.unit_price * item.quantity))}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium">Subtotal</span>
                  <span className="text-slate-900 font-bold">Rp {formatCurrency(viewingDiscount.subtotal || ((viewingDiscount.total || 0) + (viewingDiscount.discount || 0)))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-rose-500 font-bold flex items-center gap-1">
                    Potongan {viewingDiscount.discount_id ? '(Voucher/Promo)' : '(Manual)'}
                  </span>
                  <span className="text-rose-600 font-black">- Rp {formatCurrency(viewingDiscount.discount)}</span>
                </div>
                <div className="flex justify-between text-base pt-2 border-t-2 border-dashed border-slate-200">
                  <span className="font-black text-slate-900">Total Akhir</span>
                  <span className="font-black text-blue-600 text-lg">Rp {formatCurrency(viewingDiscount.total)}</span>
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded-xl flex items-start gap-2 border border-blue-100">
                <Info className="w-4 h-4 text-blue-500 mt-0.5" />
                <p className="text-[11px] text-blue-700 leading-relaxed">
                  <strong>Catatan:</strong> Potongan ini {(viewingDiscount.discount_id) ? 'diambil secara otomatis dari sistem manajemen diskon yang aktif saat transaksi.' : 'diberikan secara manual oleh petugas kasir saat proses input transaksi.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="py-12 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setViewingDiscount(null)} className="w-full">Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showReminderDialog} onOpenChange={setShowReminderDialog}>
        <DialogContent className="w-[95vw] max-w-2xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-lg">Add Follow-up Reminder</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddReminder} className="space-y-3">
            <div>
              <Label>Title *</Label>
              <Input
                value={reminderForm.title}
                onChange={(e) => setReminderForm({...reminderForm, title: e.target.value})}
                placeholder="e.g., Follow up on quote"
                className="mt-1 text-sm"
                required
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={reminderForm.description}
                onChange={(e) => setReminderForm({...reminderForm, description: e.target.value})}
                placeholder="Additional details..."
                rows={3}
                className="mt-1 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Due Date *</Label>
                <Input
                  type="date"
                  value={reminderForm.due_date}
                  onChange={(e) => setReminderForm({...reminderForm, due_date: e.target.value})}
                  className="mt-1 text-sm"
                  required
                />
              </div>
              <div>
                <Label>Ingatkan Saya</Label>
                <Select value={String(reminderForm.remind_days_before)} onValueChange={(v) => setReminderForm({...reminderForm, remind_days_before: parseInt(v)})}>
                  <SelectTrigger className="mt-1 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Pada Hari H</SelectItem>
                    <SelectItem value="1">H-1 (1 Hari Sebelum)</SelectItem>
                    <SelectItem value="2">H-2 (2 Hari Sebelum)</SelectItem>
                    <SelectItem value="7">H-7 (1 Minggu Sebelum)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={reminderForm.priority} onValueChange={(v) => setReminderForm({...reminderForm, priority: v})}>
                  <SelectTrigger className="mt-1 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={() => setShowReminderDialog(false)} className="text-sm">
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} className="text-sm">
                {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Hidden detailed table for Export */}
      <div id="print-customer-detailed" className="hidden">
        <div className="mb-6 border-b pb-4 text-center">
          <h2 className="text-xl font-bold">Ringkasan Profil</h2>
          <div className="grid grid-cols-2 gap-4 mt-2 text-left">
            <div>
              <p><strong>Nama:</strong> {customer?.name}</p>
              <p><strong>Telepon:</strong> {customer?.phone || '-'}</p>
              <p><strong>Email:</strong> {customer?.email || '-'}</p>
              <p><strong>Alamat:</strong> {customer?.address || '-'}</p>
            </div>
            <div className="text-right">
              <p className="text-lg">Total Belanja: <strong>Rp {formatCurrency(totalSpent)}</strong></p>
              <p className="text-lg text-red-600">Total Piutang (Receivable): <strong>Rp {formatCurrency(totalReceivables)}</strong></p>
              <p>Loyalty: <strong>{loyaltyInfo?.current_tier || 'Bronze'}</strong> ({loyaltyInfo?.total_points || 0} pts)</p>
            </div>
          </div>
        </div>

        <h3 className="text-lg font-bold mb-2">Riwayat Transaksi & Diskon</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Tanggal & Waktu</TableHead>
              <TableHead>Metode</TableHead>
              <TableHead>Diskon</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx) => (
              <TableRow key={tx.id}>
                <TableCell className="font-bold text-blue-600">{tx.invoice_number}</TableCell>
                <TableCell>{tx.timestamp_wib}</TableCell>
                <TableCell>{tx.payment_method}</TableCell>
                <TableCell>Rp {formatCurrency(tx.discount || 0)}</TableCell>
                <TableCell className="text-right font-bold">Rp {formatCurrency(tx.total)}</TableCell>
                <TableCell>{tx.payment_status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <h3 className="text-lg font-bold mt-8 mb-2">Rincian Item Terbeli</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No. Invoice</TableHead>
              <TableHead>Produk</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Harga Satuan</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.flatMap(tx => (tx.items || []).map((item, idx) => (
              <TableRow key={`${tx.id}-${idx}`}>
                <TableCell className="text-xs">{tx.invoice_number}</TableCell>
                <TableCell>{item.product_name}</TableCell>
                <TableCell>{item.quantity}</TableCell>
                <TableCell>Rp {formatCurrency(item.unit_price)}</TableCell>
                <TableCell className="text-right">Rp {formatCurrency(item.subtotal)}</TableCell>
              </TableRow>
            )))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

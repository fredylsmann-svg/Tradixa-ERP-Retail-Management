import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, History, Download, FileText, Loader2, RefreshCw, User, Database, Activity } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

const formatWIB = (ts) => {
  if (!ts) return { date: '-', time: '' };
  try {
    const d = new Date(ts);
    if (!isNaN(d.getTime())) {
      // Supabase TIMESTAMPTZ returns ISO UTC string.
      // We convert to local, then force offset to UTC+7 for WIB.
      // If the string already has Z or +00, new Date(ts) handles it.
      const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
      const wib = new Date(utc + (7 * 60 * 60 * 1000));
      
      const dateStr = format(wib, 'dd MMM yyyy', { locale: id });
      const timeStr = format(wib, 'HH:mm:ss');
      return { date: dateStr, time: timeStr + ' WIB' };
    }
    
    // Fallback if string is not standard ISO
    const parts = ts.split(' ');
    if (parts.length >= 2) {
      return { date: parts[0], time: parts[1] + ' WIB' };
    }
    return { date: String(ts), time: '' };
  } catch {
    return { date: String(ts), time: '' };
  }
};

export default function AuditLog({ store }) {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');

  const loadLogs = async () => {
    if (!store?.id) return;
    setIsLoading(true);
    try {
      const data = await api.entities.SystemAuditLog.filter({ store_id: store.id }, '-created_at');
      setLogs(data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
    
    // Listener untuk tombol refresh di Header
    const handleRefreshEvent = () => {
      loadLogs();
    };
    window.addEventListener('refresh_data', handleRefreshEvent);

    return () => {
      window.removeEventListener('refresh_data', handleRefreshEvent);
    };
  }, [store?.id]);

  const getActionBadge = (action) => {
    const styles = {
      create: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      update: 'bg-blue-100 text-blue-700 border-blue-200',
      delete: 'bg-red-100 text-red-700 border-red-200',
      status_change: 'bg-amber-100 text-amber-700 border-amber-200',
      email_sent: 'bg-purple-100 text-purple-700 border-purple-200',
      payment: 'bg-indigo-100 text-indigo-700 border-indigo-200'
    };
    
    return (
      <Badge variant="outline" className={`${styles[action] || 'bg-slate-100 text-slate-700'} font-bold capitalize text-[10px] px-2 py-0.5 rounded-md`}>
        {action.replace('_', ' ')}
      </Badge>
    );
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      (log.description?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.user_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.entity_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.entity_id?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesAction = actionFilter === 'all' || log.action_type === actionFilter;
    const matchesEntity = entityFilter === 'all' || log.entity_name === entityFilter;

    return matchesSearch && matchesAction && matchesEntity;
  });

  const uniqueEntities = [...new Set(logs.map(l => l.entity_name))].sort();

  const exportCSV = () => {
    const headers = ['No', 'Waktu', 'Entity', 'Entity ID', 'Aksi', 'Deskripsi', 'User', 'Email'];
    const rows = filteredLogs.map((log, idx) => [
      idx + 1,
      (() => { const f = formatWIB(log.timestamp_wib); return f.date + ' ' + f.time; })(),
      log.entity_name,
      log.entity_id,
      log.action_type,
      log.description,
      log.user_name,
      log.user_email
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `audit_log_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        subtitle="Riwayat perubahan dan aktivitas sistem"
        icon={History}
        actions={
          <Button variant="outline" onClick={loadLogs} className="h-11 px-4 rounded-xl border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all">
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          <Input
            placeholder="Cari deskripsi, user, atau ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 h-12 bg-white border-none shadow-sm rounded-xl text-sm"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="h-12 w-[160px] bg-white border-none shadow-sm rounded-xl font-medium">
              <SelectValue placeholder="Semua Aksi" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-100">
              <SelectItem value="all">Semua Aksi</SelectItem>
              <SelectItem value="create">Create</SelectItem>
              <SelectItem value="update">Update</SelectItem>
              <SelectItem value="delete">Delete</SelectItem>
              <SelectItem value="status_change">Status Change</SelectItem>
              <SelectItem value="email_sent">Email Sent</SelectItem>
              <SelectItem value="payment">Payment</SelectItem>
            </SelectContent>
          </Select>

          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="h-12 w-[160px] bg-white border-none shadow-sm rounded-xl font-medium">
              <SelectValue placeholder="Semua Entity" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-100">
              <SelectItem value="all">Semua Entity</SelectItem>
              {uniqueEntities.map(entity => (
                <SelectItem key={entity} value={entity}>{entity}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCSV} className="h-12 px-4 rounded-xl border-slate-200 text-slate-600 font-bold hover:bg-slate-50">
              <Download className="w-4 h-4 mr-2" />
              CSV
            </Button>
            <Button variant="outline" onClick={() => window.print()} className="h-12 px-4 rounded-xl border-emerald-100 text-emerald-600 font-bold hover:bg-emerald-50">
              <FileText className="w-4 h-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>
      </div>

      <Card className="rounded-xl border-none shadow-xl shadow-slate-200/50 overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="pl-8 w-12">No.</TableHead>
                <TableHead>Waktu</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Aksi</TableHead>
                <TableHead className="max-w-[300px]">Deskripsi</TableHead>
                <TableHead className="pr-8">User</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6} className="py-8 text-center">
                      <div className="flex items-center justify-center gap-2 text-slate-400">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Memuat data...
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-20 text-center">
                    <History className="w-12 h-12 mx-auto mb-4 text-slate-200" />
                    <p className="text-slate-500 font-medium">Belum ada riwayat aktivitas</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log, idx) => (
                  <TableRow key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                    <TableCell className="pl-8 text-slate-400 font-bold">{idx + 1}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-900">
                          {formatWIB(log.timestamp_wib).date}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                          {formatWIB(log.timestamp_wib).time}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-800 tracking-tight">{log.entity_name}</span>
                        <span className="text-[10px] text-blue-500 font-mono mt-0.5">
                          {log.entity_id?.substring(0, 8)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{getActionBadge(log.action_type)}</TableCell>
                    <TableCell className="max-w-[300px]">
                      <p className="text-xs text-slate-600 leading-relaxed font-medium line-clamp-2">
                        {log.description}
                      </p>
                    </TableCell>
                    <TableCell className="pr-8">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                          <User className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {log.user_name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium truncate">
                            {log.user_email}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '@/api/client';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Key, User, Mail, UserPlus, Eye, EyeOff } from 'lucide-react';

export default function StaffRegister() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const queryParams = new URLSearchParams(location.search);
  const storeId = queryParams.get('store_id');
  const role = queryParams.get('role');
  const position = queryParams.get('pos');
  const modules = queryParams.get('modules');
  const auths = queryParams.get('auths');
  const limitParam = queryParams.get('limit');
  const discountParam = queryParams.get('discount');

  useEffect(() => {
    const nameParam = queryParams.get('name');
    if (nameParam) {
      setFormData(prev => ({ ...prev, name: nameParam }));
    }

    if (!storeId || !role || !position) {
      toast({
        title: "Link Tidak Valid",
        description: "Tautan pendaftaran tidak lengkap atau tidak valid.",
        variant: "destructive"
      });
    } else {
      loadStoreName();
    }
  }, []);

  const loadStoreName = async () => {
    try {
      const stores = await api.entities.Store.filter({ id: storeId });
      if (stores.length > 0) {
        setStoreName(stores[0].store_name);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast({ title: "Password Tidak Sama", description: "Konfirmasi password harus sama dengan password.", variant: "destructive" });
      return;
    }
    if (formData.password.length < 6) {
      toast({ title: "Password Terlalu Pendek", description: "Password minimal 6 karakter.", variant: "destructive" });
      return;
    }
    
    setIsLoading(true);
    let createdUserId = null;
    try {
      // 1. Check if email already exists in users table
      const { data: existingUser } = await supabase
        .from('users')
        .select('email')
        .eq('email', formData.email)
        .maybeSingle();

      if (existingUser) {
        toast({ title: "Email Sudah Terdaftar", description: "Email ini sudah terdaftar di sistem. Silakan gunakan email lain atau langsung Login.", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      // 2. Create user record in DB FIRST (before auth.signUp)
      //    This prevents AuthContext's resolveUser from auto-creating
      //    a duplicate record when signUp triggers SIGNED_IN event.
      const newUser = await api.entities.User.create({
        full_name: formData.name,
        email: formData.email,
        role: role || 'staff',
        position: position,
        modules: modules ? modules.split(',') : [],
        authorities: auths ? auths.split(',') : [],
        approval_limit: limitParam ? parseFloat(limitParam) : 0,
        max_discount_limit: discountParam ? parseFloat(discountParam) : 0,
        current_store_id: storeId,
        is_store_setup_completed: true
      });
      createdUserId = newUser?.id;

      // 3. Create Supabase Auth account (email+password)
      //    This will trigger onAuthStateChange → resolveUser, but since
      //    the DB record already exists, it will use it instead of auto-creating.
      const { error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: { data: { full_name: formData.name } }
      });
      if (authError) throw authError;

      // 4. Sign out to prevent auto-login (staff should login explicitly)
      await supabase.auth.signOut();

      toast({
        title: "Pendaftaran Berhasil!",
        description: "Akun karyawan berhasil dibuat. Silakan login.",
      });
      navigate('/login?registered=true');
    } catch (error) {
      // Rollback: if auth creation failed but DB record was created, delete it
      if (createdUserId) {
        try { await api.entities.User.delete(createdUserId); } catch (e) {}
      }
      toast({
        title: "Pendaftaran Gagal",
        description: error.message,
        variant: "destructive"
      });
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-slate-200">
        <CardHeader className="space-y-2 text-center pb-6">
          <div className="mx-auto w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-2">
            <UserPlus className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-bold">Registrasi Karyawan</CardTitle>
          <CardDescription>
            Anda diundang untuk bergabung dengan sistem 
            {storeName ? <span className="font-bold text-slate-800"> {storeName}</span> : ' ERP'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Lengkap</Label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  id="name"
                  placeholder="Budi Santoso"
                  className="pl-9"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="budi@example.com"
                  className="pl-9"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Buat password baru"
                  className="pl-9 pr-10"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
              <div className="relative">
                <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Ulangi password"
                  className="pl-9 pr-10"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors">
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg mt-4 border text-xs text-slate-600 space-y-1">
              <p><span className="font-bold">Posisi:</span> {position}</p>
              <p><span className="font-bold">Hak Akses:</span> {role === 'admin' ? 'Admin' : 'Staff'}</p>
            </div>

            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 h-11 text-base mt-2" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Buat Akun Karyawan
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center border-t p-4 text-xs text-slate-500">
          Tradixa Enterprise System &copy; 2026
        </CardFooter>
      </Card>
    </div>
  );
}

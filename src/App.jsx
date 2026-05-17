
import { Suspense, lazy } from "react"
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from '@/components/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { DateProvider } from '@/contexts/DateContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import Login from '@/pages/Login';
import StaffRegister from './pages/StaffRegister';
import SignUp from '@/pages/SignUp';
import ResetPassword from '@/pages/ResetPassword';
import PublicTracker from './pages/PublicTracker';
import tradixaLogo from '@/assets/tradixa-logo-transparent.png';

// Lazy-loaded public pages (heavy components that don't need eager loading)
const PublicPOSign = lazy(() => import('./pages/PublicPOSign'));
const PublicGRNSign = lazy(() => import('./pages/PublicGRNSign'));
const PublicGRNManagerSign = lazy(() => import('./pages/PublicGRNManagerSign'));
const PublicReturnReview = lazy(() => import('./pages/PublicReturnReview'));
const PublicInvoice = lazy(() => import('./pages/PublicInvoice'));
const PublicCourierPortal = lazy(() => import('./pages/PublicCourierPortal'));
const ProcurementWorkflow = lazy(() => import('./pages/ProcurementWorkflow'));


const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

// Shared loading fallback component
const LoadingFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
    <div className="text-center animate-in fade-in zoom-in duration-500 flex flex-col items-center max-md:gap-4 md:-mt-32">
      <img src={tradixaLogo} alt="Tradixa" className="w-48 md:w-60 h-auto mx-auto animate-pulse object-contain" />
      <div className="flex items-center gap-1.5 md:-mt-16">
        <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce"></div>
      </div>
    </div>
  </div>
);

// Recovery UI when auth times out (prevents blank screen on low-end mobile)
const RecoveryFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
    <div className="text-center px-6 max-w-sm">
      <img src={tradixaLogo} alt="Tradixa" className="w-40 h-auto mx-auto mb-2 object-contain" />
      <p className="text-slate-500 text-sm mb-6">
        Koneksi memerlukan waktu lebih lama dari biasanya. Ini bisa terjadi karena koneksi internet lambat atau perangkat sedang sibuk.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-lg"
      >
        Muat Ulang Halaman
      </button>
      <button
        onClick={() => { window.location.href = '/login'; }}
        className="block mx-auto mt-3 text-sm text-blue-600 font-medium hover:underline"
      >
        Kembali ke Login
      </button>
    </div>
  </div>
);

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoadingAuth, authTimedOut } = useAuth();
  
  if (authTimedOut) {
    return <RecoveryFallback />;
  }
  
  if (isLoadingAuth) {
    return <LoadingFallback />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Login Route Guard Component
const LoginRoute = () => {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  
  if (isLoadingAuth) {
    return <LoadingFallback />;
  }
  
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return <Login />;
};

function App() {
  return (
    <DateProvider>
    <AuthProvider>
    <SettingsProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Public Login Route */}
            <Route path="/login" element={<LoginRoute />} />
            
            {/* Public Staff Registration Route */}
            <Route path="/register" element={<StaffRegister />} />
            
            {/* Public Business Sign Up Route */}
            <Route path="/signup" element={<SignUp />} />

            {/* Public Reset Password Route */}
            <Route path="/reset-password" element={<ResetPassword />} />
            
            {/* Public PO Signature Route */}
            <Route path="/public/po/:id/sign" element={<PublicPOSign />} />
            
            {/* Public GRN Signature Route */}
            <Route path="/public/grn/:id/sign" element={<PublicGRNSign />} />
            
            {/* Public GRN Manager Signature Route */}
            <Route path="/public/grn-manager/:id/sign" element={<PublicGRNManagerSign />} />
            
            {/* Public Return Review Route */}
            <Route path="/public/return/:id/review" element={<PublicReturnReview />} />
            
            {/* Public Invoice Route */}
            <Route path="/public/invoice/:type/:id" element={<PublicInvoice />} />

            {/* Public Courier Portal Route */}
            <Route path="/public/delivery/:id/courier" element={<PublicCourierPortal />} />

            {/* Email Tracking Route */}
            <Route path="/track/:type/:id" element={<PublicTracker />} />

            {/* Chart of Accounts Route */}
            <Route path="/ChartOfAccounts" element={
              <ProtectedRoute>
                <LayoutWrapper currentPageName="ChartOfAccounts">
                  <Pages.ChartOfAccounts />
                </LayoutWrapper>
              </ProtectedRoute>
            } />

            {/* Explicit Journal Detail Route */}
            <Route path="/JournalEntries/:id" element={
              <ProtectedRoute>
                <LayoutWrapper currentPageName="JournalDetail">
                  <Pages.JournalDetail />
                </LayoutWrapper>
              </ProtectedRoute>
            } />

            {/* Explicit Procurement Workflow Route */}
            <Route path="/ProcurementWorkflow" element={
              <ProtectedRoute>
                <LayoutWrapper currentPageName="ProcurementWorkflow">
                  <ProcurementWorkflow />
                </LayoutWrapper>
              </ProtectedRoute>
            } />

            
            {/* Protected Main Routings */}
            <Route path="/" element={
              <ProtectedRoute>
                <LayoutWrapper currentPageName={mainPageKey}>
                  <MainPage />
                </LayoutWrapper>
              </ProtectedRoute>
            } />
            
            {Object.entries(Pages).map(([path, Page]) => (
              <Route
                key={path}
                path={`/${path}`}
                element={
                  <ProtectedRoute>
                    <LayoutWrapper currentPageName={path}>
                      <Page />
                    </LayoutWrapper>
                  </ProtectedRoute>
                }
              />
            ))}
            
            <Route path="*" element={<PageNotFound />} />
          </Routes>
          </Suspense>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </SettingsProvider>
    </AuthProvider>
    </DateProvider>
  )
}

export default App


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
import PublicPOSign from './pages/PublicPOSign';
import PublicGRNSign from './pages/PublicGRNSign';
import PublicReturnReview from './pages/PublicReturnReview';
import PublicInvoice from './pages/PublicInvoice';
import ProcurementWorkflow from './pages/ProcurementWorkflow';
import StaffRegister from './pages/StaffRegister';
import SignUp from '@/pages/SignUp';
import PublicTracker from './pages/PublicTracker';


const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  
  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
        <div className="text-center animate-in fade-in zoom-in duration-500 flex flex-col items-center -mt-32">
          <img src="/src/assets/tradixa-logo-transparent.png" alt="Tradixa" className="h-48 md:h-60 mx-auto animate-pulse" />
          <div className="flex items-center gap-1.5 -mt-16">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce"></div>
          </div>
        </div>
      </div>
    );
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
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
        <div className="text-center animate-in fade-in zoom-in duration-500 flex flex-col items-center -mt-32">
          <img src="/src/assets/tradixa-logo-transparent.png" alt="Tradixa" className="h-48 md:h-60 mx-auto animate-pulse" />
          <div className="flex items-center gap-1.5 -mt-16">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce"></div>
          </div>
        </div>
      </div>
    );
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
          <Routes>
            {/* Public Login Route */}
            <Route path="/login" element={<LoginRoute />} />
            
            {/* Public Staff Registration Route */}
            <Route path="/register" element={<StaffRegister />} />
            
            {/* Public Business Sign Up Route */}
            <Route path="/signup" element={<SignUp />} />
            
            {/* Public PO Signature Route */}
            <Route path="/public/po/:id/sign" element={<PublicPOSign />} />
            
            {/* Public GRN Signature Route */}
            <Route path="/public/grn/:id/sign" element={<PublicGRNSign />} />
            
            {/* Public Return Review Route */}
            <Route path="/public/return/:id/review" element={<PublicReturnReview />} />
            
            {/* Public Invoice Route */}
            <Route path="/public/invoice/:type/:id" element={<PublicInvoice />} />

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
        </Router>
        <Toaster />
      </QueryClientProvider>
    </SettingsProvider>
    </AuthProvider>
    </DateProvider>
  )
}

export default App

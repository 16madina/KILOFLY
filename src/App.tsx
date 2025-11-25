import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Home from "./pages/Home";
import PostListing from "./pages/PostListing";
import Messages from "./pages/Messages";
import Conversation from "./pages/Conversation";
import Profile from "./pages/Profile";
import Auth from "./pages/Auth";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import AdminVerification from "./pages/AdminVerification";
import NotFound from "./pages/NotFound";
import ProhibitedItems from "./pages/ProhibitedItems";
import AdminReports from "./pages/AdminReports";
import Settings from "./pages/Settings";
import MyListings from "./pages/MyListings";
import MyTransactions from "./pages/MyTransactions";
import MyReservations from "./pages/MyReservations";
import AccountSecurity from "./pages/AccountSecurity";
import TrustScoreInfo from "./pages/TrustScoreInfo";
import AdminTransactions from "./pages/AdminTransactions";
import UserTransactions from "./pages/UserTransactions";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import AdminListings from "./pages/AdminListings";
import PrivacySettings from "./pages/PrivacySettings";
import Favorites from "./pages/Favorites";
import RouteAlerts from "./pages/RouteAlerts";
import CookieConsent from "./components/CookieConsent";
import MobileBottomNav from "./components/MobileBottomNav";
import { AuthProvider } from "./contexts/AuthContext";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <div className="relative">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/post" element={<PostListing />} />
                  <Route path="/messages" element={<Messages />} />
                  <Route path="/conversation/:id" element={<Conversation />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/prohibited-items" element={<ProhibitedItems />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/users" element={<AdminUsers />} />
                  <Route path="/admin/listings" element={<AdminListings />} />
                  <Route path="/admin/verification" element={<AdminVerification />} />
                  <Route path="/admin/reports" element={<AdminReports />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/my-listings" element={<MyListings />} />
                  <Route path="/my-transactions" element={<MyTransactions />} />
                  <Route path="/my-reservations" element={<MyReservations />} />
                  <Route path="/user-transactions" element={<UserTransactions />} />
                  <Route path="/admin/transactions" element={<AdminTransactions />} />
                  <Route path="/account-security" element={<AccountSecurity />} />
                  <Route path="/privacy-settings" element={<PrivacySettings />} />
                  <Route path="/trust-score-info" element={<TrustScoreInfo />} />
                  <Route path="/favorites" element={<Favorites />} />
                  <Route path="/route-alerts" element={<RouteAlerts />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
                <MobileBottomNav />
                <CookieConsent />
              </div>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

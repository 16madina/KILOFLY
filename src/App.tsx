import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AnimatePresence, motion } from "framer-motion";
import { isIOS } from "@/lib/platform";
import { useSwipeable } from "react-swipeable";
import Home from "./pages/Home";
import PostChoice from "./pages/PostChoice";
import PostListing from "./pages/PostListing";
import PostRequest from "./pages/PostRequest";
import Messages from "./pages/Messages";
import Conversation from "./pages/Conversation";
import Profile from "./pages/Profile";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import AdminVerification from "./pages/AdminVerification";
import AdminAIAnalytics from "./pages/AdminAIAnalytics";
import NotFound from "./pages/NotFound";
import ProhibitedItems from "./pages/ProhibitedItems";
import AdminReports from "./pages/AdminReports";
import Settings from "./pages/Settings";
import MyListings from "./pages/MyListings";
import MyTransactions from "./pages/MyTransactions";

import AccountSecurity from "./pages/AccountSecurity";
import TrustScoreInfo from "./pages/TrustScoreInfo";
import AdminTransactions from "./pages/AdminTransactions";
import UserTransactions from "./pages/UserTransactions";
import AdminDashboard from "./pages/AdminDashboard";
import AdminEmail from "./pages/AdminEmail";
import AdminUsers from "./pages/AdminUsers";
import AdminListings from "./pages/AdminListings";
import PrivacySettings from "./pages/PrivacySettings";
import Favorites from "./pages/Favorites";
import RouteAlerts from "./pages/RouteAlerts";
import VerifyIdentity from "./pages/VerifyIdentity";
import FAQ from "./pages/FAQ";
import ListingDetail from "./pages/ListingDetail";
import PublicProfile from "./pages/PublicProfile";
import Payment from "./pages/Payment";
import PaymentSuccess from "./pages/PaymentSuccess";
import CurrencySettings from "./pages/CurrencySettings";
import MyTransportRequests from "./pages/MyTransportRequests";
import TransportRequestDetail from "./pages/TransportRequestDetail";
import Tracking from "./pages/Tracking";
import EmailConfirmed from "./pages/EmailConfirmed";
import ResetPassword from "./pages/ResetPassword";
import MyRewards from "./pages/MyRewards";
import Wallet from "./pages/Wallet";
import ReservationChatPage from "./pages/ReservationChatPage";
import AdminWavePayments from "./pages/AdminWavePayments";
import CookieConsent from "./components/CookieConsent";
import MobileBottomNav from "./components/MobileBottomNav";
import { AuthProvider } from "./contexts/AuthContext";
import { useExchangeRates } from "./hooks/useExchangeRates";
import { useCurrencyWelcome } from "./hooks/useCurrencyWelcome";
import { useTransportOfferNotifications } from "./hooks/useTransportOfferNotifications";
import { useKeyboardScroll } from "./hooks/useKeyboardScroll";
import { useDeepLinks } from "./hooks/useDeepLinks";

const queryClient = new QueryClient();

const AnimatedRoutes = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Swipe back gesture for iOS
  const swipeHandlers = useSwipeable({
    onSwipedRight: (eventData) => {
      // Only on iOS and only if swiping from left edge (first 50px)
      if (isIOS() && eventData.initial[0] < 50) {
        navigate(-1);
      }
    },
    trackMouse: false,
    trackTouch: true,
  });
  
  const pageVariants = isIOS()
    ? {
        // iOS style - slide from right
        initial: { x: "100%", opacity: 0 },
        animate: { x: 0, opacity: 1 },
        exit: { x: "-30%", opacity: 0 },
      }
    : {
        // Android style - fade up
        initial: { y: 20, opacity: 0 },
        animate: { y: 0, opacity: 1 },
        exit: { y: -20, opacity: 0 },
      };

  const pageTransition = {
    type: "tween" as const,
    ease: [0.4, 0, 0.2, 1] as const,
    duration: 0.3,
  };

  return (
    <div {...swipeHandlers} className="h-full">
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <motion.div
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
            >
              <Home />
            </motion.div>
          }
        />
        <Route path="/tracking" element={<motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}><Tracking /></motion.div>} />
        <Route path="/post" element={<motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}><PostChoice /></motion.div>} />
        <Route path="/post-listing" element={<motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}><PostListing /></motion.div>} />
        <Route path="/post-request" element={<motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}><PostRequest /></motion.div>} />
        <Route path="/messages" element={<motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}><Messages /></motion.div>} />
        <Route path="/conversation/:id" element={<motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}><Conversation /></motion.div>} />
        <Route path="/reservation-chat/:id" element={<motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}><ReservationChatPage /></motion.div>} />
        <Route path="/profile" element={<motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}><Profile /></motion.div>} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/onboarding" element={<Onboarding />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/prohibited-items" element={<ProhibitedItems />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/email" element={<AdminEmail />} />
                  <Route path="/admin/users" element={<AdminUsers />} />
                  <Route path="/admin/listings" element={<AdminListings />} />
                  <Route path="/admin/verification" element={<AdminVerification />} />
                  <Route path="/admin/ai-analytics" element={<AdminAIAnalytics />} />
                  <Route path="/admin/reports" element={<AdminReports />} />
                  <Route path="/admin/wave-payments" element={<AdminWavePayments />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/my-listings" element={<MyListings />} />
                  <Route path="/my-transactions" element={<MyTransactions />} />
                  <Route path="/my-transport-requests" element={<MyTransportRequests />} />
                  
                  <Route path="/user-transactions" element={<UserTransactions />} />
                  <Route path="/admin/transactions" element={<AdminTransactions />} />
                  <Route path="/account-security" element={<AccountSecurity />} />
                  <Route path="/privacy-settings" element={<PrivacySettings />} />
                  <Route path="/currency-settings" element={<CurrencySettings />} />
                  <Route path="/trust-score-info" element={<TrustScoreInfo />} />
                  <Route path="/my-rewards" element={<MyRewards />} />
                  <Route path="/wallet" element={<motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}><Wallet /></motion.div>} />
                  <Route path="/favorites" element={<Favorites />} />
                  <Route path="/route-alerts" element={<RouteAlerts />} />
          <Route path="/verify-identity" element={<VerifyIdentity />} />
          <Route path="/email-confirmed" element={<EmailConfirmed />} />
          <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/faq" element={<FAQ />} />
                  <Route path="/payment" element={<motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}><Payment /></motion.div>} />
                  <Route path="/payment-success" element={<motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}><PaymentSuccess /></motion.div>} />
                  <Route path="/listing/:id" element={<motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}><ListingDetail /></motion.div>} />
                  <Route path="/request/:id" element={<motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}><TransportRequestDetail /></motion.div>} />
                  <Route path="/user/:id" element={<motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}><PublicProfile /></motion.div>} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}><NotFound /></motion.div>} />
        </Routes>
      </AnimatePresence>
    </div>
  );
};

const AppContent = () => {
  useCurrencyWelcome();
  useTransportOfferNotifications();
  useKeyboardScroll();
  useDeepLinks(); // Handle deep links for Universal Links / App Links
  
  return (
    <div className="relative">
      <AnimatedRoutes />
      <MobileBottomNav />
      <CookieConsent />
    </div>
  );
};

function App() {
  // Update exchange rates on app load
  useExchangeRates();
  
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <AppContent />
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

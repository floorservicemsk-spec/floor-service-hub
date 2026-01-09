"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { api, User, DealerProfile, BonusSettings } from "@/lib/api";

interface UserContextValue {
  user: User | null;
  dealerProfile: DealerProfile | null;
  bonusEnabled: boolean;
  loading: boolean;
  isBlocked: boolean;
  needsApproval: boolean;
  effectiveTier: string | null;
  isAdmin: boolean;
  displayName: string;
  logout: () => Promise<void>;
  login: () => Promise<void>;
  refreshUser: () => void;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [dealerProfile, setDealerProfile] = useState<DealerProfile | null>(null);
  const [bonusEnabled, setBonusEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [needsApproval, setNeedsApproval] = useState(false);

  const loadUser = useCallback(async () => {
    if (status === "loading") return;
    
    setLoading(true);
    setIsBlocked(false);
    setNeedsApproval(false);

    if (status === "unauthenticated" || !session?.user) {
      setUser(null);
      setDealerProfile(null);
      setLoading(false);
      return;
    }

    try {
      // Load user data and bonus settings in parallel
      const [currentUser, bonusSettings] = await Promise.all([
        api.me(),
        api.getBonusSettings().catch(() => [] as BonusSettings[]),
      ]);

      setBonusEnabled(bonusSettings[0]?.enabled !== false);

      if (currentUser.isBlocked) {
        await signOut({ redirect: false });
        setIsBlocked(true);
        setUser(null);
        setDealerProfile(null);
      } else if (!currentUser.isApproved && currentUser.role !== "ADMIN") {
        setNeedsApproval(true);
        setUser(currentUser);
        setDealerProfile(currentUser.dealerProfile || null);
      } else {
        setUser(currentUser);
        setDealerProfile(currentUser.dealerProfile || null);
      }
    } catch (error) {
      console.error("Error loading user:", error);
      setUser(null);
      setDealerProfile(null);
    }

    setLoading(false);
  }, [session, status]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    // Listen for global user updates
    const onUserUpdated = () => loadUser();
    window.addEventListener("user-updated", onUserUpdated);
    return () => window.removeEventListener("user-updated", onUserUpdated);
  }, [loadUser]);

  const logout = useCallback(async () => {
    await signOut({ redirect: true, callbackUrl: "/login" });
    setUser(null);
    setDealerProfile(null);
  }, []);

  const login = useCallback(async () => {
    await signIn();
  }, []);

  const refreshUser = useCallback(() => {
    loadUser();
  }, [loadUser]);

  // Calculate effective tier
  const effectiveTier = useMemo(() => {
    if (!bonusEnabled || !dealerProfile) return null;
    const now = new Date();
    const manual =
      dealerProfile.manualTierEnabled &&
      dealerProfile.manualTier &&
      (!dealerProfile.manualTierExpiresAt ||
        new Date(dealerProfile.manualTierExpiresAt) > now);
    return manual
      ? dealerProfile.manualTier
      : dealerProfile.currentTier || null;
  }, [bonusEnabled, dealerProfile]);

  const value: UserContextValue = {
    user,
    dealerProfile,
    bonusEnabled,
    loading: loading || status === "loading",
    isBlocked,
    needsApproval,
    effectiveTier,
    isAdmin: user?.role === "ADMIN",
    displayName:
      user?.displayName || user?.fullName || user?.email || "Пользователь",
    logout,
    login,
    refreshUser,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}

export default UserContext;

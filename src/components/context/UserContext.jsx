import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { User } from "@/entities/User";
import { DealerProfile } from "@/entities/DealerProfile";
import { BonusSettings } from "@/entities/BonusSettings";

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [dealerProfile, setDealerProfile] = useState(null);
  const [bonusEnabled, setBonusEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [needsApproval, setNeedsApproval] = useState(false);

  const loadUser = useCallback(async () => {
    setLoading(true);
    setIsBlocked(false);
    setNeedsApproval(false);
    
    try {
      // Параллельная загрузка пользователя и настроек бонусов
      const [currentUser, bonusSettings] = await Promise.all([
        User.me(),
        BonusSettings.list().catch(() => [])
      ]);
      
      setBonusEnabled(bonusSettings[0]?.enabled !== false);

      if (currentUser.is_blocked) {
        await User.logout();
        setIsBlocked(true);
        setUser(null);
        setDealerProfile(null);
      } else if (!currentUser.is_approved && currentUser.role !== 'admin') {
        setNeedsApproval(true);
        setUser(currentUser);
        if (!currentUser.approval_requested_at) {
          await User.updateMyUserData({
            approval_requested_at: new Date().toISOString()
          });
        }
      } else {
        setUser(currentUser);
        
        // Загружаем профиль дилера если нужно
        if (currentUser.user_type === 'dealer') {
          const prof = await DealerProfile.filter({ user_id: currentUser.id });
          setDealerProfile(prof[0] || null);
        } else {
          setDealerProfile(null);
        }
      }
    } catch (error) {
      console.log("Пользователь не авторизован", error);
      setUser(null);
      setDealerProfile(null);
    }
    
    setLoading(false);
  }, []);

  useEffect(() => {
    loadUser();
    
    // Подписка на глобальные обновления профиля
    const onUserUpdated = () => loadUser();
    window.addEventListener('user-updated', onUserUpdated);
    return () => window.removeEventListener('user-updated', onUserUpdated);
  }, [loadUser]);

  const logout = useCallback(async () => {
    await User.logout();
    setUser(null);
    setDealerProfile(null);
  }, []);

  const login = useCallback(async () => {
    await User.login();
  }, []);

  const refreshUser = useCallback(() => {
    loadUser();
  }, [loadUser]);

  // Вычисляем эффективный тир
  const effectiveTier = (() => {
    if (!bonusEnabled || !dealerProfile) return null;
    const now = new Date();
    const manual = dealerProfile?.manual_tier_enabled && dealerProfile?.manual_tier &&
      (!dealerProfile?.manual_tier_expires_at || new Date(dealerProfile.manual_tier_expires_at) > now);
    return manual ? dealerProfile?.manual_tier : (dealerProfile?.current_tier || null);
  })();

  const value = {
    user,
    dealerProfile,
    bonusEnabled,
    loading,
    isBlocked,
    needsApproval,
    effectiveTier,
    isAdmin: user?.role === 'admin',
    displayName: user?.display_name || user?.full_name || user?.email || 'Пользователь',
    logout,
    login,
    refreshUser
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

export default UserContext;
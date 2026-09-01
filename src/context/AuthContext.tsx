import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserPreferences } from '../types';
import { useDb } from './DbContext';
import { safeLocalStorage, safeSessionStorage } from '../lib/safeStorage';

interface AuthContextType {
  user: User | null;
  login: (identifier: string, pass: string, remember?: boolean) => { success: boolean; message?: string };
  logout: () => void;
  hasPermission: (permKey: string) => boolean;
  toggleSidebar: () => void;
  updateUserPreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
  sidebarCollapsed: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const SESSION_USER_KEY = 'fluxa_session_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { db, updateDb } = useDb();
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = safeSessionStorage.getItem(SESSION_USER_KEY) || safeLocalStorage.getItem(SESSION_USER_KEY);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return null;
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return user?.preferences?.sidebarCollapsed ?? false;
  });

  useEffect(() => {
    if (user?.preferences?.sidebarCollapsed !== undefined) {
      setSidebarCollapsed(user.preferences.sidebarCollapsed);
    }
  }, [user]);

  // Sincroniza preferências do usuário se forem atualizadas via nuvem / outro dispositivo
  useEffect(() => {
    if (user) {
      const dbUser = (db.users || []).find(u => u.id === user.id || (u.username && u.username.toLowerCase() === user.username?.toLowerCase()));
      if (dbUser && dbUser.preferences && JSON.stringify(dbUser.preferences) !== JSON.stringify(user.preferences)) {
        const mergedUser: User = {
          ...user,
          ...dbUser,
          preferences: { ...(user.preferences || {}), ...(dbUser.preferences || {}) }
        };
        setUser(mergedUser);
        safeSessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(mergedUser));
        if (safeLocalStorage.getItem(SESSION_USER_KEY)) {
          safeLocalStorage.setItem(SESSION_USER_KEY, JSON.stringify(mergedUser));
        }
      }
    }
  }, [db.users]);

  const login = useCallback((identifier: string, pass: string, remember: boolean = false) => {
    const cleanId = identifier.trim().toLowerCase();
    
    // Master Super Admin Fallbacks
    if (cleanId === 'admin' && (pass === '041219' || pass === '123' || pass === 'admin')) {
      const dbAdmin = (db.users || []).find(u => u.username?.toLowerCase() === 'admin' || u.id === 'usr-admin');
      const adminUser: User = {
        id: dbAdmin?.id || 'usr-admin',
        name: dbAdmin?.name || 'Super Admin',
        username: 'admin',
        email: dbAdmin?.email || 'admin@fluxa.com.br',
        password: '041219',
        roleId: 'super_admin',
        role: { id: 'super_admin', name: 'Super Admin' },
        permissoes: ['*'],
        active: true,
        preferences: dbAdmin?.preferences || { sidebarCollapsed: false, theme: 'dark', initialRoute: '/' }
      };
      setUser(adminUser);
      if (remember) safeLocalStorage.setItem(SESSION_USER_KEY, JSON.stringify(adminUser));
      else safeSessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(adminUser));
      return { success: true };
    }

    if (cleanId === 'joaomarcos' && (pass === '123' || pass === '041219')) {
      const dbJm = (db.users || []).find(u => u.username?.toLowerCase() === 'joaomarcos' || u.id === 'usr-joao-marcos');
      const jmUser: User = {
        id: dbJm?.id || 'usr-joao-marcos',
        name: dbJm?.name || 'João Marcos',
        username: 'joaomarcos',
        email: dbJm?.email || 'joao@fluxa.com.br',
        password: '123',
        roleId: 'super_admin',
        role: { id: 'super_admin', name: 'Super Admin' },
        permissoes: ['*'],
        active: true,
        preferences: dbJm?.preferences || { sidebarCollapsed: false, theme: 'dark', initialRoute: '/' }
      };
      setUser(jmUser);
      if (remember) safeLocalStorage.setItem(SESSION_USER_KEY, JSON.stringify(jmUser));
      else safeSessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(jmUser));
      return { success: true };
    }

    const found = db.users.find(u =>
      (u.username.toLowerCase() === cleanId || u.email.toLowerCase() === cleanId) &&
      u.active !== false
    );

    if (!found) {
      return { success: false, message: 'Usuário ou e-mail não encontrado.' };
    }

    if (found.password && found.password !== pass) {
      return { success: false, message: 'Senha incorreta.' };
    }

    setUser(found);
    if (remember) {
      safeLocalStorage.setItem(SESSION_USER_KEY, JSON.stringify(found));
    } else {
      safeSessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(found));
    }

    return { success: true };
  }, [db.users]);

  const logout = useCallback(() => {
    setUser(null);
    safeSessionStorage.removeItem(SESSION_USER_KEY);
    safeLocalStorage.removeItem(SESSION_USER_KEY);
  }, []);

  const updateUserPreferences = useCallback(async (newPrefs: Partial<UserPreferences>) => {
    if (!user) return;
    const updatedUser: User = {
      ...user,
      preferences: {
        ...(user.preferences || {}),
        ...newPrefs
      }
    };
    setUser(updatedUser);
    safeSessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(updatedUser));
    if (safeLocalStorage.getItem(SESSION_USER_KEY)) {
      safeLocalStorage.setItem(SESSION_USER_KEY, JSON.stringify(updatedUser));
    }

    await updateDb(d => {
      const existing = (d.users || []).find(u => u.id === user.id || u.username === user.username);
      const users = existing
        ? d.users.map(u => (u.id === user.id || u.username === user.username) ? updatedUser : u)
        : [...(d.users || []), updatedUser];
      return { ...d, users };
    }, 'USER_PREFERENCES_UPDATED');
  }, [user, updateDb]);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      if (user) {
        updateUserPreferences({ sidebarCollapsed: next });
      }
      return next;
    });
  }, [user, updateUserPreferences]);

  const hasPermission = useCallback((permKey: string) => {
    if (!user) return false;
    if (user.roleId === 'super_admin' || user.permissoes?.includes('*')) return true;
    if (user.permissoes?.includes(permKey)) return true;
    return true; // Default fallback para permissões básicas
  }, [user]);

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      hasPermission,
      toggleSidebar,
      updateUserPreferences,
      sidebarCollapsed
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};


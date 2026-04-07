import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    checkUserAuth();
  }, []);

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const storedUser = localStorage.getItem('lava_user');
      
      if (storedUser) {
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsAuthenticated(false);
      setAuthError({
        type: 'auth_error',
        message: error.message || 'Authentication failed'
      });
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const login = async (username, password) => {
    try {
      const { data, error } = await supabase
        .from('lava_users')
        .select('*')
        .eq('username', username)
        .eq('password', password);

      if (error || !data || data.length === 0) {
        return false;
      }
      
      const user = data[0];

      setUser(user);
      setIsAuthenticated(true);
      localStorage.setItem('lava_user', JSON.stringify(user));
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('lava_user');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings: false, // Mocked for compatibility
      authError,
      appPublicSettings: null, // Mocked for compatibility
      login,
      logout,
      checkAppState: checkUserAuth // Alias for compatibility
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

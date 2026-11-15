import { createContext, useContext, useState, useEffect } from 'react';
import { getMeApi, loginApi, registerApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      loadCurrentUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const loadCurrentUser = async () => {
    try {
      const res = await getMeApi();
      setUser(res.data.user);
    } catch (err) {
      console.warn('Session expired or invalid:', err.message);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const res = await loginApi(email, password);
    const { token: newToken, user: userData } = res.data;
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
    return userData;
  };

  const register = async (userData) => {
    const res = await registerApi(userData);
    const { token: newToken, user: newUser } = res.data;
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(newUser);
    return newUser;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
  };

  const updateCurrentUser = (updatedUser) => {
    setUser(prev => ({ ...prev, ...updatedUser }));
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      isLoggedIn: !!user,
      isTeacherOrAdmin: user?.role === 'teacher' || user?.role === 'admin',
      login,
      register,
      logout,
      updateCurrentUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

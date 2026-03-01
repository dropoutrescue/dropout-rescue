'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface User {
  id: string;
  name: string;
  email: string;
  area?: string;
  bio?: string;
  phone?: string;
  is_admin: boolean;
  games_played: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => void;
}

interface SignupData {
  name: string;
  email: string;
  password: string;
  area?: string;
  bio?: string;
  phone?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load stored auth on mount
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('user_data');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email,
      password,
    });

    const { access_token, user: userData } = response.data;
    
    localStorage.setItem('auth_token', access_token);
    localStorage.setItem('user_data', JSON.stringify(userData));
    
    setToken(access_token);
    setUser(userData);
  };

  const signup = async (data: SignupData) => {
    const response = await axios.post(`${API_URL}/auth/signup`, data);

    const { access_token, user: userData } = response.data;
    
    localStorage.setItem('auth_token', access_token);
    localStorage.setItem('user_data', JSON.stringify(userData));
    
    setToken(access_token);
    setUser(userData);
  };

  const logout = () => {
    // Clear all auth-related data from localStorage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    
    // Also clear sessionStorage as a backup
    sessionStorage.clear();
    
    // Clear state
    setToken(null);
    setUser(null);
    
    // Force page reload to clear any cached state (helps with Safari)
    // Use replace to prevent back button from restoring session
    window.location.replace('/auth/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
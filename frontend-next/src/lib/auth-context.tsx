'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface User {
  id: number;
  email: string;
  username: string;
  riot_id: string | null;
  region: string | null;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateProfile: (data: UpdateProfileData) => Promise<void>;
}

interface RegisterData {
  email: string;
  username: string;
  password: string;
  riot_id?: string;
  region?: string;
}

interface UpdateProfileData {
  username?: string;
  riot_id?: string;
  region?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const TOKEN_KEY = 'valai_token';
const USER_KEY = 'valai_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load auth state from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      // Verify token is still valid
      verifyToken(storedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const verifyToken = async (authToken: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/account/me`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        localStorage.setItem(USER_KEY, JSON.stringify(userData));
      } else {
        // Token is invalid, clear auth state
        logout();
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/api/account/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }

    const data = await response.json();
    const authToken = data.access_token;
    
    // Get user profile
    const profileResponse = await fetch(`${API_BASE_URL}/api/account/me`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    if (!profileResponse.ok) {
      throw new Error('Failed to fetch user profile');
    }

    const userData = await profileResponse.json();
    
    // Save to state and localStorage
    setToken(authToken);
    setUser(userData);
    localStorage.setItem(TOKEN_KEY, authToken);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
  };

  const register = async (data: RegisterData) => {
    const response = await fetch(`${API_BASE_URL}/api/account/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Registration failed');
    }

    // Auto-login after registration
    await login(data.email, data.password);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  const updateProfile = async (data: UpdateProfileData) => {
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE_URL}/api/account/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Profile update failed');
    }

    const userData = await response.json();
    setUser(userData);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        token, 
        isLoading, 
        isAuthenticated: !!user && !!token,
        login, 
        register, 
        logout,
        updateProfile 
      }}
    >
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

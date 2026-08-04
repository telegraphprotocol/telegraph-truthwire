import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount, useSignMessage, useDisconnect } from 'wagmi';
import api from '../utils/api';

export const useAuth = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [user, setUser] = useState<any>(null);

  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();

  // Ref guard — prevents concurrent or duplicate login calls
  const loginInProgressRef = useRef(false);

  // Stable refs so the effect below can call these without them being deps
  const signMessageRef = useRef(signMessageAsync);
  signMessageRef.current = signMessageAsync;

  const checkStatus = useCallback(async (): Promise<boolean> => {
    const token = localStorage.getItem('telegraph_token');
    if (!token) return false;

    try {
      const { data } = await api.get('/auth/status');
      setUser(data.user);
      setIsLoggedIn(true);
      return true;
    } catch {
      localStorage.removeItem('telegraph_token');
      setIsLoggedIn(false);
      setUser(null);
      return false;
    }
  }, []);

  const login = useCallback(async (addr: string) => {
    if (loginInProgressRef.current) return;
    loginInProgressRef.current = true;
    setIsAuthenticating(true);

    try {
      // 1. Get message
      const { data: { message } } = await api.get('/auth/message');

      // 2. Sign once — let wagmi use the connected account (no account override)
      const signature = await signMessageRef.current({ message });

      // 3. Verify → receive JWT, store it
      const { data: { token, user: userData } } = await api.post('/auth/verify', { address: addr, signature });

      localStorage.setItem('telegraph_token', token);
      setUser(userData);
      setIsLoggedIn(true);
    } catch (error) {
      console.error('[auth] login failed:', error);
    } finally {
      loginInProgressRef.current = false;
      setIsAuthenticating(false);
    }
  }, []); // no deps — address passed as argument, signMessage accessed via ref

  const logout = useCallback(() => {
    localStorage.removeItem('telegraph_token');
    setIsLoggedIn(false);
    setUser(null);
    disconnect();
  }, [disconnect]);

  // Main flow: runs only when wallet connection state changes.
  // Check stored JWT first → sign only if there is none / it's expired.
  useEffect(() => {
    if (!isConnected || !address) {
      setIsLoggedIn(false);
      setUser(null);
      return;
    }

    let cancelled = false;

    const init = async () => {
      const valid = await checkStatus();
      if (!cancelled && !valid) {
        await login(address);
      }
    };

    init();

    return () => { cancelled = true; };
  }, [isConnected, address]); // intentionally excludes login/checkStatus — they don't need to re-trigger this

  // Re-auth when a protected route returns 401 (token expired mid-session)
  useEffect(() => {
    const handle = () => {
      setIsLoggedIn(false);
      setUser(null);
      if (isConnected && address) login(address);
    };
    window.addEventListener('auth_required', handle);
    return () => window.removeEventListener('auth_required', handle);
  }, [isConnected, address, login]);

  return { isLoggedIn, isAuthenticating, user, login: () => address && login(address), logout, checkStatus };
};

import { createContext, useState, useContext, useEffect } from 'react';
import { login as loginApi, register as registerApi, getMe, updateProfile as updateProfileApiReq, parentLogin as parentLoginApi } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const parseJwt = (token) => {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (_e) {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => {
    return !!localStorage.getItem('token');
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      getMe()
        .then((res) => {
          const payload = parseJwt(token);
          const activeRole = payload?.role || res.data.role;
          setUser({ ...res.data, role: activeRole });
        })
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    }
  }, []);

  const login = async (email, password) => {
    const res = await loginApi({ email, password });
    localStorage.setItem('token', res.data.access_token);
    setUser(res.data.user);
    return res.data.user;
  };

  const register = async (data) => {
    await registerApi(data);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const updateProfileApi = async (data) => {
    const res = await updateProfileApiReq(data);
    setUser(res.data);
    return res.data;
  };

  const parentLogin = async (parentCode) => {
    const res = await parentLoginApi({ parent_code: parentCode });
    localStorage.setItem('token', res.data.access_token);
    const parentUser = { ...res.data.user, role: 'parent' };
    setUser(parentUser);
    return parentUser;
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, updateProfileApi, parentLogin }}>
      {children}
    </AuthContext.Provider>
  );
};


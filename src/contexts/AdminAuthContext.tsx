import { createContext, useContext, useState, ReactNode } from "react";

interface AdminAuthContextType {
  authenticated: boolean;
  login: (pin: string) => boolean;
  logout: () => void;
  scannerAuthenticated: boolean;
  scannerLogin: (pin: string) => boolean;
  scannerLogout: () => void;
}

const ADMIN_PIN = "admin2024";
const SCANNER_PIN = "scanner2024";

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

export const AdminAuthProvider = ({ children }: { children: ReactNode }) => {
  const [authenticated, setAuthenticated] = useState(false);
  const [scannerAuthenticated, setScannerAuthenticated] = useState(false);

  const login = (pin: string) => {
    if (pin === ADMIN_PIN) {
      setAuthenticated(true);
      return true;
    }
    return false;
  };

  const logout = () => setAuthenticated(false);

  const scannerLogin = (pin: string) => {
    if (pin === SCANNER_PIN || pin === ADMIN_PIN) {
      setScannerAuthenticated(true);
      return true;
    }
    return false;
  };

  const scannerLogout = () => setScannerAuthenticated(false);

  return (
    <AdminAuthContext.Provider value={{ authenticated, login, logout, scannerAuthenticated, scannerLogin, scannerLogout }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
};

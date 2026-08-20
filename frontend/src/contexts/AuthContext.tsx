import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

import { getCurrentUser } from "../services/api";


// ==========================================================
// USER TYPE
// ==========================================================

export interface User {
  id: number;

  email: string;

  role: "admin" | "customer";

  first_name?: string;

  last_name?: string;

  phone?: string | null;

  name?: string;

  created_at?: string;

  is_active?: boolean;

  is_verified?: boolean;
}


// ==========================================================
// AUTH CONTEXT TYPE
// ==========================================================

interface AuthContextType {
  user: User | null;

  token: string | null;

  isAuthenticated: boolean;

  isLoading: boolean;

  login: (
    token: string
  ) => Promise<User | null>;

  logout: () => void;

  refreshUser: () => Promise<User | null>;
}


// ==========================================================
// CONTEXT
// ==========================================================

const AuthContext =
  createContext<AuthContextType | undefined>(
    undefined
  );


// ==========================================================
// AUTH PROVIDER
// ==========================================================

export const AuthProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {

  const [token, setToken] =
    useState<string | null>(() =>
      localStorage.getItem(
        "access_token"
      )
    );

  const [user, setUser] =
    useState<User | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);


  // ========================================================
  // FETCH CURRENT USER
  // ========================================================

  const fetchProfile =
    useCallback(
      async (): Promise<User | null> => {

        const savedToken =
          localStorage.getItem(
            "access_token"
          );


        // --------------------------------------------------
        // No token
        // --------------------------------------------------

        if (!savedToken) {

          setUser(null);

          setToken(null);

          setIsLoading(false);

          return null;
        }


        // --------------------------------------------------
        // Token exists
        // --------------------------------------------------

        setToken(savedToken);

        setIsLoading(true);


        try {

          const userData =
            await getCurrentUser();


          console.log(
            "AUTH CURRENT USER 👉",
            userData
          );


          // ------------------------------------------------
          // Save user
          // ------------------------------------------------

          setUser(userData);


          // ------------------------------------------------
          // Synchronize role
          // ------------------------------------------------

          if (userData?.role) {

            localStorage.setItem(
              "role",
              userData.role
            );
          }


          return userData;

        } catch (err) {

          console.error(
            "Failed to fetch user profile:",
            err
          );


          // ------------------------------------------------
          // Invalid token
          // ------------------------------------------------

          localStorage.removeItem(
            "access_token"
          );

          localStorage.removeItem(
            "token"
          );

          localStorage.removeItem(
            "role"
          );


          setToken(null);

          setUser(null);


          return null;

        } finally {

          setIsLoading(false);
        }

      },
      []
    );


  // ========================================================
  // INITIAL AUTH CHECK
  // ========================================================

  useEffect(() => {

    fetchProfile();

  }, [fetchProfile]);


  // ========================================================
  // LOGIN
  // ========================================================

  const login = async (
    newToken: string
  ): Promise<User | null> => {

    // ------------------------------------------------------
    // Save token immediately
    // ------------------------------------------------------

    localStorage.setItem(
      "access_token",
      newToken
    );

    localStorage.setItem(
      "token",
      newToken
    );


    setToken(newToken);

    setIsLoading(true);


    try {

      // ----------------------------------------------------
      // Fetch actual user from backend
      // ----------------------------------------------------

      const userData =
        await getCurrentUser();


      console.log(
        "AUTH USER AFTER LOGIN 👉",
        userData
      );


      // ----------------------------------------------------
      // Save user
      // ----------------------------------------------------

      setUser(userData);


      // ----------------------------------------------------
      // Save role
      // ----------------------------------------------------

      if (userData?.role) {

        localStorage.setItem(
          "role",
          userData.role
        );
      }


      return userData;

    } catch (err) {

      console.error(
        "Failed to fetch user profile during login:",
        err
      );


      localStorage.removeItem(
        "access_token"
      );

      localStorage.removeItem(
        "token"
      );

      localStorage.removeItem(
        "role"
      );


      setToken(null);

      setUser(null);


      throw err;

    } finally {

      setIsLoading(false);
    }
  };


  // ========================================================
  // LOGOUT
  // ========================================================

  const logout = () => {

    localStorage.removeItem(
      "access_token"
    );

    localStorage.removeItem(
      "token"
    );

    localStorage.removeItem(
      "role"
    );


    setToken(null);

    setUser(null);

    setIsLoading(false);
  };


  // ========================================================
  // REFRESH USER
  // ========================================================

  const refreshUser =
    async (): Promise<User | null> => {

      return await fetchProfile();
    };


  // ========================================================
  // PROVIDER
  // ========================================================

  return (
    <AuthContext.Provider
      value={{
        user,

        token,

        isAuthenticated:
          Boolean(token && user),

        isLoading,

        login,

        logout,

        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};


// ==========================================================
// USE AUTH HOOK
// ==========================================================

export const useAuth =
  (): AuthContextType => {

    const context =
      useContext(AuthContext);


    if (!context) {

      throw new Error(
        "useAuth must be used within an AuthProvider"
      );
    }


    return context;
  };


export default AuthContext;

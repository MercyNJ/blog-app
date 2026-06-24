import { createContext, useEffect, useState } from "react";

export const UserContext = createContext({});

export function UserContextProvider({ children }) {
  const API_URL = import.meta.env.VITE_API_URL;

  const [userInfo, setUserInfo] = useState(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const response = await fetch(`${API_URL}/profile`, {
          credentials: 'include',
        });

        if (!response.ok) {
          setUserInfo(null);
          return;
        }

        const data = await response.json();
        setUserInfo(data);

      } catch (error) {
        console.error('Profile fetch error:', error);
        setUserInfo(null);
      } finally {
        setIsLoadingUser(false);
      }
    }

    fetchProfile();
  }, [API_URL]);

  return (
    <UserContext.Provider
      value={{
        userInfo,
        setUserInfo,
        isLoadingUser
      }}
    >
      {children}
    </UserContext.Provider>
  );
}
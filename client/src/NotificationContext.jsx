import { createContext, useCallback, useEffect, useState } from "react";

const NOTIFICATION_DURATION_MS = 4000;

export const NotificationContext = createContext({});

export function NotificationContextProvider({ children }) {
  const [notification, setNotification] = useState(null);

  // A new object each time restarts the timer, even for a repeated message.
  const showNotification = useCallback((message) => {
    setNotification({ message });
  }, []);

  useEffect(() => {
    if (!notification) {
      return;
    }

    const timer = setTimeout(() => setNotification(null), NOTIFICATION_DURATION_MS);

    return () => clearTimeout(timer);
  }, [notification]);

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}

      <div className="notification-region" role="status" aria-live="polite">
        {notification && (
          <div className="notification">
            <span>{notification.message}</span>

            <button
              type="button"
              className="notification-close"
              onClick={() => setNotification(null)}
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </NotificationContext.Provider>
  );
}

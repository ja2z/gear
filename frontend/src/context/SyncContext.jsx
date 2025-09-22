import { createContext, useContext, useState } from 'react';

const SyncContext = createContext();

export const useSync = () => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
};

export const SyncProvider = ({ children }) => {
  const [hasSyncedInSession, setHasSyncedInSession] = useState(false);
  const [sessionType, setSessionType] = useState(null); // 'checkout' or 'checkin'

  const markSynced = (type) => {
    setHasSyncedInSession(true);
    setSessionType(type);
  };

  const resetSync = () => {
    setHasSyncedInSession(false);
    setSessionType(null);
  };

  const shouldSync = (type) => {
    // Only sync if we haven't synced yet, or if it's a different session type
    return !hasSyncedInSession || sessionType !== type;
  };

  return (
    <SyncContext.Provider
      value={{
        hasSyncedInSession,
        sessionType,
        markSynced,
        resetSync,
        shouldSync,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
};

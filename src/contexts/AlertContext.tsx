import React, { createContext, ReactNode, useContext, useState } from 'react';

export type AlertButtonStyle = 'default' | 'cancel' | 'destructive';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: AlertButtonStyle;
}

export interface AlertData {
  title: string;
  message?: string;
  buttons?: AlertButton[];
  cancelable?: boolean;
}

interface AlertContextData {
  alertData: AlertData | null;
  showAlert: (title: string, message?: string, buttons?: AlertButton[], options?: { cancelable?: boolean }) => void;
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextData>({} as AlertContextData);

export const AlertProvider = ({ children }: { children: ReactNode }) => {
  const [alertData, setAlertData] = useState<AlertData | null>(null);

  const showAlert = (title: string, message?: string, buttons?: AlertButton[], options?: { cancelable?: boolean }) => {
    // Mimic default RN Alert behavior by providing an "OK" button if none are supplied
    const resolvedButtons = buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }];
    setAlertData({
      title,
      message,
      buttons: resolvedButtons,
      cancelable: options?.cancelable ?? true,
    });
  };

  const hideAlert = () => {
    setAlertData(null);
  };

  return (
    <AlertContext.Provider value={{ alertData, showAlert, hideAlert }}>
      {children}
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};


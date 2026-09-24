import React from 'react';
import { Navigate } from 'react-router-dom';
import { useProfile } from '../context/ProfileContext';

export function AdminRouteGuard({ children }: { children: React.ReactNode }) {
  const { currentProfile, forcePinChange } = useProfile();

  if (currentProfile === 'assistant' || forcePinChange) {
    // Forbidden and redirected for assistant or when default PIN must be changed
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

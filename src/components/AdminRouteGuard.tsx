import React from 'react';
import { Navigate } from 'react-router-dom';
import { useProfile } from '../context/ProfileContext';

export function AdminRouteGuard({ children }: { children: React.ReactNode }) {
  const { currentProfile } = useProfile();

  if (currentProfile === 'assistant') {
    // Completely forbidden and hidden from assistant
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

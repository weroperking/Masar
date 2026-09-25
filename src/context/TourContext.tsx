import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth, useOrganization } from '@clerk/clerk-react';
import { ADMIN_TOUR_STEPS, ASSISTANT_TOUR_STEPS, TourStep } from '../components/Tour/tourSteps';
import { useProfile } from './ProfileContext';

export type TourType = 'admin' | 'assistant';

import { STUDENT_LOOKUP_PATH_PREFIX } from '../utils/studentCode';

interface TourContextType {
  isActive: boolean;
  tourType: TourType;
  currentStepIndex: number;
  currentStep: TourStep;
  totalSteps: number;
  hasCompletedTour: boolean;
  startTour: (stepIndex?: number, type?: TourType) => void;
  startAdminTour: (stepIndex?: number) => void;
  startAssistantTour: (stepIndex?: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  finishTour: () => void;
  targetRect: DOMRect | null;
  isReady: boolean;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export function TourProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, userId } = useAuth();
  const { organization } = useOrganization();
  const { currentProfile, isLocked, showProfileSelector } = useProfile();
  const location = useLocation();
  const navigate = useNavigate();

  const [activeTourType, setActiveTourType] = useState<TourType>(
    currentProfile === 'assistant' ? 'assistant' : 'admin'
  );

  const baseUserKey = organization?.id || userId || 'global';
  const storageKey = `masar_tour_completed_${activeTourType}_${baseUserKey}`;

  const [hasCompletedTour, setHasCompletedTour] = useState<boolean>(() => {
    return localStorage.getItem(storageKey) === 'true';
  });

  const [isActive, setIsActive] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isReady, setIsReady] = useState<boolean>(false);

  // Sync active tour type default with current profile when profile switches
  useEffect(() => {
    if (!isActive) {
      const defaultType: TourType = currentProfile === 'assistant' ? 'assistant' : 'admin';
      setActiveTourType(defaultType);
      const key = `masar_tour_completed_${defaultType}_${baseUserKey}`;
      setHasCompletedTour(localStorage.getItem(key) === 'true');
    }
  }, [currentProfile, baseUserKey, isActive]);

  // Update completed status when user/org or tourType changes
  useEffect(() => {
    const completed = localStorage.getItem(storageKey) === 'true';
    setHasCompletedTour(completed);
  }, [storageKey]);

  // Determine active steps array
  const activeSteps = activeTourType === 'assistant' ? ASSISTANT_TOUR_STEPS : ADMIN_TOUR_STEPS;
  const currentStep = activeSteps[currentStepIndex] || activeSteps[0];

  // First-time auto-trigger for current profile tour if not completed and profile is selected/unlocked
  useEffect(() => {
    if (!isSignedIn || hasCompletedTour || isLocked || showProfileSelector || window.location.pathname.startsWith(STUDENT_LOOKUP_PATH_PREFIX)) {
      return;
    }

    const timer = setTimeout(() => {
      if (!hasCompletedTour && !isActive && !isLocked && !showProfileSelector) {
        setIsActive(true);
        setCurrentStepIndex(0);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [isSignedIn, hasCompletedTour, activeTourType, isLocked, showProfileSelector, isActive]);

  // Route synchronization & Target Element Measurement
  const updateTargetRect = useCallback(() => {
    if (!isActive || !currentStep) {
      setTargetRect(null);
      setIsReady(false);
      return;
    }

    const element = document.querySelector(currentStep.selector);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      const rect = element.getBoundingClientRect();
      setTargetRect(rect);
      setIsReady(true);
    } else {
      setTargetRect(null);
      setIsReady(true);
    }
  }, [isActive, currentStep]);

  // Navigate when step route differs from current pathname
  useEffect(() => {
    if (!isActive || !currentStep) return;

    if (currentStep.route && location.pathname !== currentStep.route) {
      setIsReady(false);
      navigate(currentStep.route);
    }
  }, [isActive, currentStepIndex, currentStep?.route, location.pathname, navigate]);

  // Re-measure target element upon route changes, step changes, resize, or scroll
  useEffect(() => {
    if (!isActive) return;

    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      const element = document.querySelector(currentStep?.selector || '');
      if (element || attempts > 10) {
        clearInterval(interval);
        updateTargetRect();
      }
    }, 100);

    window.addEventListener('resize', updateTargetRect);
    window.addEventListener('scroll', updateTargetRect, true);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', updateTargetRect);
      window.removeEventListener('scroll', updateTargetRect, true);
    };
  }, [isActive, currentStepIndex, currentStep, location.pathname, updateTargetRect]);

  const startTour = (stepIndex: number = 0, type?: TourType) => {
    const selectedType = type || (currentProfile === 'assistant' ? 'assistant' : 'admin');
    setActiveTourType(selectedType);
    setCurrentStepIndex(stepIndex);
    setIsActive(true);
    const steps = selectedType === 'assistant' ? ASSISTANT_TOUR_STEPS : ADMIN_TOUR_STEPS;
    const targetStep = steps[stepIndex] || steps[0];
    if (targetStep.route && location.pathname !== targetStep.route) {
      navigate(targetStep.route);
    }
  };

  const startAdminTour = (stepIndex: number = 0) => {
    startTour(stepIndex, 'admin');
  };

  const startAssistantTour = (stepIndex: number = 0) => {
    startTour(stepIndex, 'assistant');
  };

  const nextStep = () => {
    if (currentStepIndex + 1 < activeSteps.length) {
      const nextIdx = currentStepIndex + 1;
      const nextTarget = activeSteps[nextIdx];
      setCurrentStepIndex(nextIdx);
      if (nextTarget.route && location.pathname !== nextTarget.route) {
        navigate(nextTarget.route);
      }
    } else {
      finishTour();
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      const prevIdx = currentStepIndex - 1;
      const prevTarget = activeSteps[prevIdx];
      setCurrentStepIndex(prevIdx);
      if (prevTarget.route && location.pathname !== prevTarget.route) {
        navigate(prevTarget.route);
      }
    }
  };

  const skipTour = () => {
    setIsActive(false);
    setHasCompletedTour(true);
    localStorage.setItem(storageKey, 'true');
    if (location.pathname !== '/') {
      navigate('/');
    }
  };

  const finishTour = () => {
    setIsActive(false);
    setHasCompletedTour(true);
    localStorage.setItem(storageKey, 'true');
    if (location.pathname !== '/') {
      navigate('/');
    }
  };

  return (
    <TourContext.Provider
      value={{
        isActive,
        tourType: activeTourType,
        currentStepIndex,
        currentStep,
        totalSteps: activeSteps.length,
        hasCompletedTour,
        startTour,
        startAdminTour,
        startAssistantTour,
        nextStep,
        prevStep,
        skipTour,
        finishTour,
        targetRect,
        isReady
      }}
    >
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
}

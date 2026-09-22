import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth, useOrganization } from '@clerk/clerk-react';
import { TOUR_STEPS, TourStep } from '../components/Tour/tourSteps';

interface TourContextType {
  isActive: boolean;
  currentStepIndex: number;
  currentStep: TourStep;
  totalSteps: number;
  hasCompletedTour: boolean;
  startTour: (stepIndex?: number) => void;
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
  const location = useLocation();
  const navigate = useNavigate();

  const storageKey = `masar_tour_completed_${organization?.id || userId || 'global'}`;

  const [hasCompletedTour, setHasCompletedTour] = useState<boolean>(() => {
    return localStorage.getItem(storageKey) === 'true';
  });

  const [isActive, setIsActive] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isReady, setIsReady] = useState<boolean>(false);

  // Update hasCompletedTour when user or org changes
  useEffect(() => {
    const completed = localStorage.getItem(storageKey) === 'true';
    setHasCompletedTour(completed);
  }, [storageKey]);

  // First-time trigger: Automatically start tour once when authenticated and not completed
  useEffect(() => {
    // Only auto-start on desktop/tablet viewports and not on public standalone routes
    if (!isSignedIn || hasCompletedTour || window.location.pathname.startsWith('/p/s/') || window.location.pathname.startsWith('/book')) {
      return;
    }

    // Short delay to allow initial layout to render
    const timer = setTimeout(() => {
      if (!hasCompletedTour && !isActive) {
        setIsActive(true);
        setCurrentStepIndex(0);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [isSignedIn, hasCompletedTour]);

  const currentStep = TOUR_STEPS[currentStepIndex] || TOUR_STEPS[0];

  // Route synchronization & Target Element Measurement
  const updateTargetRect = useCallback(() => {
    if (!isActive || !currentStep) {
      setTargetRect(null);
      setIsReady(false);
      return;
    }

    const element = document.querySelector(currentStep.selector);
    if (element) {
      // Scroll element smoothly into viewport if needed
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      const rect = element.getBoundingClientRect();
      setTargetRect(rect);
      setIsReady(true);
    } else {
      // Fallback center position if element isn't found immediately
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

    // Retry finding element in case of page transition
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      const element = document.querySelector(currentStep.selector);
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
  }, [isActive, currentStepIndex, location.pathname, updateTargetRect]);

  const startTour = (stepIndex: number = 0) => {
    setCurrentStepIndex(stepIndex);
    setIsActive(true);
    const targetStep = TOUR_STEPS[stepIndex] || TOUR_STEPS[0];
    if (targetStep.route && location.pathname !== targetStep.route) {
      navigate(targetStep.route);
    }
  };

  const nextStep = () => {
    if (currentStepIndex + 1 < TOUR_STEPS.length) {
      const nextIdx = currentStepIndex + 1;
      const nextTarget = TOUR_STEPS[nextIdx];
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
      const prevTarget = TOUR_STEPS[prevIdx];
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
    // Navigate back to Dashboard gracefully
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
        currentStepIndex,
        currentStep,
        totalSteps: TOUR_STEPS.length,
        hasCompletedTour,
        startTour,
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

import React, { createContext, useContext, useMemo } from 'react';
import { useROS } from './ROSContext';
import { usePlayback } from './PlaybackContext';
import type { RoverState } from '../types/telemetry';

interface TelemetryContextType {
  state: RoverState;
}

const TelemetryContext = createContext<TelemetryContextType | undefined>(undefined);

/**
 * TelemetryProvider allows shadowing the rover state.
 * By default, it uses the live state from ROSContext.
 * In a playback scenario (Data Analyser), it provides the historical state.
 */
export const TelemetryProvider: React.FC<{ 
  children: React.ReactNode; 
  overrideState?: RoverState;
}> = ({ children, overrideState }) => {
  const { state: liveState } = useROS();
  const { currentState: playbackState } = usePlayback();
  
  const value = useMemo(() => ({
    state: playbackState || overrideState || liveState
  }), [playbackState, overrideState, liveState]);

  return (
    <TelemetryContext.Provider value={value}>
      {children}
    </TelemetryContext.Provider>
  );
};

export const useTelemetryState = () => {
  const context = useContext(TelemetryContext);
  // If not within a provider, we can't fall back safely without useROS
  // but we can assume the root App wraps it in a TelemetryProvider.
  if (!context) {
    throw new Error('useTelemetryState must be used within a TelemetryProvider');
  }
  return context;
};

import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback, useRef } from 'react';
import { MapData, Bus, Stop, Position } from '../types';
import { initialMapData } from '../data/mapData';

interface TransitContextProps {
  mapData: MapData;
  addPassenger: (busId: string) => void;
  removePassenger: (busId: string) => void;
  moveBusToNextStop: (busId: string) => void;
  busAnimations: Record<string, BusAnimation>;
  autoMode: boolean;
  toggleAutoMode: () => void;
}

// New interface to track bus animations
interface BusAnimation {
  isMoving: boolean;
  startPosition: Position;
  endPosition: Position;
  isUsingMainRoad: boolean;
  progress: number;
}

// Interface to track bus direction state
interface BusDirection {
  isMovingForward: boolean; // true if moving from A→D, false if moving from D→A
}

const TransitContext = createContext<TransitContextProps | undefined>(undefined);

interface TransitProviderProps {
  children: ReactNode;
}

// Helper function to find the next main stop in a route
const findNextMainStop = (route: Stop[], currentIndex: number, isMovingForward: boolean): number => {
  if (isMovingForward) {
    for (let i = currentIndex + 1; i < route.length; i++) {
      if (route[i].isMainStop) {
        return i;
      }
    }
  } else {
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (route[i].isMainStop) {
        return i;
      }
    }
  }
  
  // If no main stop is found, return the current index
  return currentIndex;
};

// Create a direct path between two main stops using the main road
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const createDirectPath = (bus: Bus, nextMainStopIndex: number): Stop[] => {
  const currentStop = bus.route[bus.currentStopIndex];
  const nextMainStop = bus.route[nextMainStopIndex];
  
  return [
    currentStop,
    nextMainStop
  ];
};

export const TransitProvider: React.FC<TransitProviderProps> = ({ children }) => {
  const [mapData, setMapData] = useState<MapData>(initialMapData);
  // New state for bus animations
  const [busAnimations, setBusAnimations] = useState<Record<string, BusAnimation>>({});
  // Track direction for each bus
  const [busDirections, setBusDirections] = useState<Record<string, BusDirection>>({
    'Bus1': { isMovingForward: true },  // Bus1 starts moving from A→D (forward)
    'Bus2': { isMovingForward: false }  // Bus2 starts moving from D→A (backward)
  });
  // Add auto mode toggle state
  const [autoMode, setAutoMode] = useState<boolean>(false);
  // Use useRef instead of state to track the timer to prevent re-renders
  const autoTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Move bus to next stop in its route, with rerouting if the bus is full
  // Define moveBusToNextStop before it's used in the useEffect hook
  const moveBusToNextStop = useCallback((busId: string) => {
    setMapData(prevData => {
      const updatedBuses = prevData.buses.map(bus => {
        if (bus.id === busId) {
          const isFull = bus.currentPassengers >= bus.capacity;
          let nextStopIndex: number;
          let nextPosition: Position = { x: 0, y: 0 }; // Initialize with default values
          let isUsingMainRoad = false;
          
          // Get current direction
          const direction = busDirections[busId] || { isMovingForward: bus.id === 'Bus1' };
          let { isMovingForward } = direction;
          
          // Check if we're at the end of the route or beginning
          const isAtEnd = bus.currentStopIndex === bus.route.length - 1;
          const isAtStart = bus.currentStopIndex === 0;
          
          // Determine if we need to reverse direction
          if (isMovingForward && isAtEnd) {
            // At the end going forward, reverse direction
            isMovingForward = false;
          } else if (!isMovingForward && isAtStart) {
            // At the start going backward, reverse direction
            isMovingForward = true;
          }
          
          // Update direction state
          setBusDirections(prev => ({
            ...prev,
            [busId]: { isMovingForward }
          }));
          
          if (isFull) {
            // If bus is full, find the next main stop and go directly there
            const nextMainStopIndex = findNextMainStop(bus.route, bus.currentStopIndex, isMovingForward);
            nextPosition = bus.route[nextMainStopIndex].position;
            nextStopIndex = nextMainStopIndex;
            isUsingMainRoad = true;
          } else {
            // Normal movement based on current direction
            nextStopIndex = isMovingForward ? bus.currentStopIndex + 1 : bus.currentStopIndex - 1;
            
            // Safety check for index bounds
            if (nextStopIndex < 0) nextStopIndex = 0;
            if (nextStopIndex >= bus.route.length) nextStopIndex = bus.route.length - 1;
            
            nextPosition = bus.route[nextStopIndex].position;
          }
          
          // Start the animation
          setBusAnimations(prev => ({
            ...prev,
            [busId]: {
              isMoving: true,
              startPosition: bus.position,
              endPosition: nextPosition,
              isUsingMainRoad: isUsingMainRoad,
              progress: 0
            }
          }));
          
          return {
            ...bus,
            currentStopIndex: nextStopIndex,
            // Don't update position here, it will be updated when animation completes
          };
        }
        return bus;
      });

      return {
        ...prevData,
        buses: updatedBuses
      };
    });
  }, [busDirections]);
  
  // Memoize handleAutoPassengers to prevent dependency changes
  const handleAutoPassengers = useCallback(() => {
    setMapData(prevData => {
      const updatedBuses = prevData.buses.map(bus => {
        const currentStop = bus.route[bus.currentStopIndex];
        let updatedPassengers = bus.currentPassengers;
        
        // Passengers can exit only at main stops
        if (currentStop.isMainStop && updatedPassengers > 0) {
          // Random number of passengers exit (1-3)
          const exitingPassengers = Math.min(
            Math.floor(Math.random() * 3) + 1, 
            updatedPassengers
          );
          updatedPassengers -= exitingPassengers;
        }
        
        // Passengers can board at any stop if there's capacity
        if (updatedPassengers < bus.capacity) {
          // Random number of passengers enter (1-2)
          const enteringPassengers = Math.min(
            Math.floor(Math.random() * 2) + 1,
            bus.capacity - updatedPassengers
          );
          updatedPassengers += enteringPassengers;
        }
        
        return {
          ...bus,
          currentPassengers: updatedPassengers
        };
      });
      
      return {
        ...prevData,
        buses: updatedBuses
      };
    });
  }, []);
  
  // Animation interval
  useEffect(() => {
    const animationInterval = setInterval(() => {
      setBusAnimations(prevAnimations => {
        // Check if there are any active animations
        const hasActiveAnimations = Object.values(prevAnimations).some(anim => anim.isMoving);
        if (!hasActiveAnimations) return prevAnimations; // No change if no active animations
        
        const updatedAnimations = { ...prevAnimations };
        let animationCompleted = false;
        
        Object.keys(updatedAnimations).forEach(busId => {
          const animation = updatedAnimations[busId];
          if (animation.isMoving) {
            // Update progress
            if (animation.progress < 1) {
              updatedAnimations[busId] = {
                ...animation,
                progress: animation.progress + 0.05
              };
            } else {
              // Animation complete
              updatedAnimations[busId] = {
                ...animation,
                isMoving: false,
                progress: 0
              };
              
              animationCompleted = true;
              
              // Update bus position when animation is complete
              setMapData(prevData => {
                const updatedBuses = prevData.buses.map(bus => {
                  if (bus.id === busId) {
                    return {
                      ...bus,
                      position: animation.endPosition
                    };
                  }
                  return bus;
                });
                
                return {
                  ...prevData,
                  buses: updatedBuses
                };
              });
            }
          }
        });
        
        // Handle auto passenger management when animation is complete
        if (animationCompleted && autoMode) {
          // Use setTimeout to avoid state update during render
          setTimeout(() => {
            handleAutoPassengers();
          }, 500);
        }
        
        return updatedAnimations;
      });
    }, 50); // 50ms interval for smooth animation
    
    return () => clearInterval(animationInterval);
  }, [autoMode, handleAutoPassengers]);
  
  // Use a separate effect for checking if any bus is moving
  const anyBusMovingRef = useRef(false);
  
  // Effect to update the anyBusMovingRef
  useEffect(() => {
    anyBusMovingRef.current = Object.values(busAnimations).some(animation => animation.isMoving);
  }, [busAnimations]);
  
  // Auto movement effect - completely separate from animation logic
  useEffect(() => {
    // Clear any existing timer first to prevent multiple timers
    if (autoTimerRef.current) {
      clearInterval(autoTimerRef.current);
      autoTimerRef.current = null;
    }
    
    // Only set up a new timer if auto mode is on
    if (autoMode) {
      // Create a new timer
      const timer = setInterval(() => {
        // Only move buses if none are currently moving
        if (!anyBusMovingRef.current) {
          mapData.buses.forEach(bus => {
            moveBusToNextStop(bus.id);
          });
        }
      }, 2000); // Check every 2 seconds
      
      // Store the timer reference
      autoTimerRef.current = timer;
      
      // Cleanup function
      return () => {
        if (autoTimerRef.current) {
          clearInterval(autoTimerRef.current);
          autoTimerRef.current = null;
        }
      };
    }
  }, [autoMode, moveBusToNextStop, mapData.buses]);
  
  // Toggle auto mode
  const toggleAutoMode = () => {
    setAutoMode(prev => !prev);
  };
  
  // Calculate current position during animation
  const getBusPosition = (busId: string) => {
    const bus = mapData.buses.find(b => b.id === busId);
    const animation = busAnimations[busId];
    
    if (!bus) return { x: 0, y: 0 };
    
    if (animation?.isMoving) {
      const { startPosition, endPosition, progress, isUsingMainRoad } = animation;
      
      let posX = startPosition.x + (endPosition.x - startPosition.x) * progress;
      // If using main road, adjust the y position to be on the main road path (40px above normal)
      let posY = isUsingMainRoad 
        ? startPosition.y - 40 + ((endPosition.y - 40) - (startPosition.y - 40)) * progress 
        : startPosition.y + (endPosition.y - startPosition.y) * progress;
      
      return { x: posX, y: posY };
    }
    
    return bus.position;
  };

  // Add a passenger to a bus
  const addPassenger = (busId: string) => {
    setMapData(prevData => {
      const updatedBuses = prevData.buses.map(bus => {
        if (bus.id === busId && bus.currentPassengers < bus.capacity) {
          return {
            ...bus,
            currentPassengers: bus.currentPassengers + 1
          };
        }
        return bus;
      });

      return {
        ...prevData,
        buses: updatedBuses
      };
    });
  };

  // Remove a passenger from a bus
  const removePassenger = (busId: string) => {
    setMapData(prevData => {
      const updatedBuses = prevData.buses.map(bus => {
        if (bus.id === busId && bus.currentPassengers > 0) {
          return {
            ...bus,
            currentPassengers: bus.currentPassengers - 1
          };
        }
        return bus;
      });

      return {
        ...prevData,
        buses: updatedBuses
      };
    });
  };

  // Update the positions of all buses based on animations
  const busesWithAnimatedPositions = mapData.buses.map(bus => {
    const animatedPosition = getBusPosition(bus.id);
    return {
      ...bus,
      position: animatedPosition
    };
  });

  const contextValue = {
    mapData: {
      ...mapData,
      buses: busesWithAnimatedPositions
    },
    addPassenger,
    removePassenger,
    moveBusToNextStop,
    busAnimations,
    autoMode,
    toggleAutoMode
  };

  return (
    <TransitContext.Provider value={contextValue}>
      {children}
    </TransitContext.Provider>
  );
};

export const useTransit = (): TransitContextProps => {
  const context = useContext(TransitContext);
  if (!context) {
    throw new Error('useTransit must be used within a TransitProvider');
  }
  return context;
}; 
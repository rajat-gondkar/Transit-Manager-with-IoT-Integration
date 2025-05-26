import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { useTransit } from '../context/TransitContext';
import ReconnectingWebSocket from 'reconnecting-websocket';

const PanelContainer = styled.div`
  width: 1000px;
  margin: 20px auto;
  padding: 20px;
  background-color: #1e1e1e;
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  border: 1px solid #333;
  color: #e0e0e0;
`;

const Title = styled.h2`
  margin-top: 0;
  color: #e0e0e0;
  text-align: center;
`;

const Subtitle = styled.p`
  text-align: center;
  color: #bbb;
  margin-top: 0;
  margin-bottom: 20px;
`;

const BusList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-top: 20px;
`;

const BusCard = styled.div<{ $isFull: boolean; $isMoving: boolean; $isUsingMainRoad: boolean }>`
  flex: 1;
  min-width: 200px;
  padding: 15px;
  background-color: #2a2a2a;
  border-radius: 5px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  border-left: 5px solid ${props => {
    if (props.$isUsingMainRoad) return '#e74c3c';
    if (props.$isMoving) return '#f1c40f';
    return props.$isFull ? '#e74c3c' : '#2ecc71';
  }};
  transition: all 0.3s ease;
  opacity: ${props => props.$isMoving ? 0.9 : 1};
  transform: ${props => props.$isMoving ? 'translateY(-2px)' : 'none'};

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  }
`;

const BusHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid #444;
`;

const BusId = styled.span`
  font-weight: bold;
  color: #f39c12;
`;

const BusCapacity = styled.span<{ $isFull: boolean }>`
  padding: 3px 8px;
  border-radius: 20px;
  font-size: 0.8rem;
  background-color: ${props => props.$isFull ? '#e74c3c' : '#2ecc71'};
  color: white;
`;

const BusLocation = styled.div`
  font-size: 0.9rem;
  color: #bbb;
`;

const BusRoute = styled.div`
  font-size: 0.9rem;
  color: #ccc;
  margin-top: 5px;
  margin-bottom: 10px;
`;

const RouteHighlight = styled.span<{ $isFull: boolean; $isUsingMainRoad: boolean }>`
  font-weight: bold;
  color: ${props => props.$isUsingMainRoad ? '#e74c3c' : props.$isFull ? '#e74c3c' : '#3498db'};
`;

const BusStatus = styled.div<{ $isMoving: boolean; $isUsingMainRoad: boolean }>`
  font-size: 0.8rem;
  margin-top: 5px;
  padding: 3px 8px;
  border-radius: 4px;
  display: inline-block;
  background-color: ${props => props.$isUsingMainRoad ? '#e74c3c' : props.$isMoving ? '#f1c40f' : '#3a3a3a'};
  color: ${props => props.$isMoving ? 'white' : '#ccc'};
`;

const DirectionIndicator = styled.span<{ $isReverse: boolean }>`
  font-weight: bold;
  color: ${props => props.$isReverse ? '#9b59b6' : '#3498db'};
`;

const BusControls = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 15px;
`;

const ControlButton = styled.button<{ color: string; disabled?: boolean }>`
  padding: 5px 10px;
  border: none;
  border-radius: 4px;
  background-color: ${props => props.disabled ? '#555' : props.color};
  color: white;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s;
  flex: 1;
  margin: 0 5px;
  opacity: ${props => props.disabled ? 0.5 : 1};

  &:hover {
    opacity: ${props => props.disabled ? 0.5 : 0.9};
    transform: ${props => props.disabled ? 'none' : 'translateY(-1px)'};
  }

  &:disabled {
    cursor: not-allowed;
  }
`;

const AutoModeContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 20px 0;
  gap: 10px;
`;

const AutoModeButton = styled.button<{ $active: boolean }>`
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  background: ${props => props.$active 
    ? 'linear-gradient(135deg, #e74c3c, #c0392b)'
    : 'linear-gradient(135deg, #3498db, #2980b9)'};
  color: white;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  }

  &:active {
    transform: translateY(0);
  }
`;

const ModeBadge = styled.span<{ $active: boolean }>`
  background-color: rgba(255, 255, 255, 0.2);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  color: white;
`;

const SidePanel = styled.div`
  position: fixed;
  right: 20px;
  top: 100px;
  width: 250px;
  background: rgba(30, 30, 30, 0.95);
  border-radius: 10px;
  padding: 15px;
  color: #fff;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  z-index: 1000;
`;

const PassengerDisplay = styled.div`
  padding: 10px;
  background: rgba(40, 40, 40, 0.9);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 10px;
`;

const BusPassengerInfo = styled.div<{ $isFull: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  margin: 5px 0;
  background: ${props => props.$isFull ? 'rgba(231, 76, 60, 0.2)' : 'rgba(46, 204, 113, 0.2)'};
  border-radius: 6px;
  border: 1px solid ${props => props.$isFull ? 'rgba(231, 76, 60, 0.4)' : 'rgba(46, 204, 113, 0.4)'};
`;

const BusLabel = styled.div`
  font-weight: bold;
`;

const PassengerValue = styled.div`
  font-size: 1.1em;
  font-weight: bold;
`;

const DeploymentStatus = styled.div`
  background: rgba(40, 40, 40, 0.9);
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 15px;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const TimerDisplay = styled.div`
  font-size: 1.2em;
  font-weight: bold;
  color: #3498db;
  margin: 5px 0;
`;

const BusCounter = styled.div`
  font-size: 1.1em;
  color: #bbb;
`;

const RECONNECT_BASE_DELAY = 2000; // 2 seconds
const RECONNECT_MAX_DELAY = 20000; // 20 seconds
const MAX_RETRIES_PER_MIN = 10;
const RELAY_WS_URL = 'ws://192.168.66.4:8080/browser';

const ControlPanel: React.FC = () => {
  const { 
    mapData, 
    addPassenger, 
    removePassenger, 
    moveBusToNextStop, 
    busAnimations,
    autoMode,
    toggleAutoMode,
    deploymentTimer,
    totalBusesDeployed
  } = useTransit();

  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [wsErrorMsg, setWsErrorMsg] = useState<string | null>(null);
  const wsRef = useRef<ReconnectingWebSocket | null>(null);

  useEffect(() => {
    setWsStatus('connecting');
    setWsErrorMsg(null);
    const ws = new ReconnectingWebSocket(RELAY_WS_URL);
    wsRef.current = ws;
    ws.onopen = () => {
      setWsStatus('connected');
      setWsErrorMsg(null);
      console.log('[Relay WS] Connected to Node.js relay');
    };
    ws.onclose = () => {
      setWsStatus('disconnected');
      setWsErrorMsg('Disconnected from relay server');
      console.log('[Relay WS] Disconnected from Node.js relay');
    };
    ws.onerror = (err: any) => {
      setWsStatus('error');
      setWsErrorMsg('WebSocket error');
      console.error('[Relay WS] Error:', err);
    };
    ws.onmessage = (event: any) => {
      if (event.data instanceof Blob) {
        const reader = new FileReader();
        reader.onload = () => {
          const msg = String(reader.result).trim();
          handleRelayMessage(msg);
        };
        reader.readAsText(event.data);
        return;
      }
      const msg = String(event.data).trim();
      handleRelayMessage(msg);
    };

    function handleRelayMessage(msg: string) {
      const match = msg.match(/^B(\d)_(BOARD|EXIT|MOVE)$/);
      if (!match) {
        console.warn('[Relay WS] Unknown message:', msg);
        return;
      }
      const busNum = match[1];
      const action = match[2];
      const busId = `Bus${busNum}`;
      if (autoMode) return;
      const bus = mapData.buses.find(b => b.id === busId);
      if (!bus) return;
      const animation = busAnimations[busId] || { isMoving: false };
      if (animation.isMoving) return;
      if (action === 'BOARD') {
        if (bus.currentPassengers < bus.capacity) addPassenger(busId);
      } else if (action === 'EXIT') {
        if (bus.currentPassengers > 0) removePassenger(busId);
      } else if (action === 'MOVE') {
        moveBusToNextStop(busId);
      }
    }

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [autoMode, mapData.buses, busAnimations, addPassenger, removePassenger, moveBusToNextStop]);

  return (
    <>
      {/* Side Panel for Passenger Display */}
      <SidePanel>
        <h3>System Status</h3>
        {totalBusesDeployed < 4 && (
          <DeploymentStatus>
            <h4>Next Bus Deployment</h4>
            <TimerDisplay>
              {Math.floor(deploymentTimer / 60)}:{(deploymentTimer % 60).toString().padStart(2, '0')}
            </TimerDisplay>
            <BusCounter>
              Buses Deployed: {totalBusesDeployed}/4
            </BusCounter>
            <div style={{ fontSize: '0.95em', color: '#888', marginTop: 4 }}>
              Mode: <b>{autoMode ? 'Auto' : 'Manual'}</b>
            </div>
            <div style={{fontSize: '0.95em', color: wsStatus === 'connected' ? '#0a0' : wsStatus === 'connecting' ? '#888' : '#a00', marginTop: 4}}>
              ESP32 Connection: <b>{wsStatus}</b>
            </div>
            {wsStatus === 'error' && (
              <div style={{ color: '#e74c3c', marginTop: 8, fontWeight: 'bold' }}>
                {wsErrorMsg || 'WebSocket connection error.'}
              </div>
            )}
          </DeploymentStatus>
        )}
        <h3>Passengers</h3>
        {mapData.buses.map(bus => {
          const isFull = bus.currentPassengers >= bus.capacity;
          return (
            <BusPassengerInfo key={bus.id} $isFull={isFull}>
              <BusLabel>{bus.id}</BusLabel>
              <PassengerValue>
                {bus.currentPassengers}/{bus.capacity}
              </PassengerValue>
            </BusPassengerInfo>
          );
        })}
      </SidePanel>

      {/* Main Control Panel at Bottom */}
      <PanelContainer>
        <Title>Bengaluru Transit Control Panel</Title>
        <Subtitle>
          Buses will use the express route (in red) when they reach full capacity
        </Subtitle>
        
        <AutoModeContainer>
          <AutoModeButton 
            $active={autoMode} 
            onClick={toggleAutoMode}
          >
            {autoMode ? "Disable Auto Mode" : "Enable Auto Mode"}
            <ModeBadge $active={autoMode}>
              {autoMode ? "ACTIVE" : "OFF"}
            </ModeBadge>
          </AutoModeButton>
        </AutoModeContainer>
        
        <BusList>
          {mapData.buses.map(bus => {
            const isFull = bus.currentPassengers >= bus.capacity;
            const currentStop = bus.route[bus.currentStopIndex];
            const animation = busAnimations[bus.id] || { isMoving: false, isUsingMainRoad: false };
            const { isMoving, isUsingMainRoad } = animation;
            
            // Determine if the bus is going in reverse direction
            const isFirstHalfOfRoute = bus.currentStopIndex < Math.floor(bus.route.length / 2);
            const isGoingForward = bus.id === 'Bus1' && isFirstHalfOfRoute;
            
            // Determine the next stop (either normal or main road)
            let nextStopDisplay;
            if (isMoving) {
              // Already moving
              if (isUsingMainRoad) {
                nextStopDisplay = (
                  <RouteHighlight $isFull={true} $isUsingMainRoad={true}>
                    {bus.route[bus.currentStopIndex].name} (via Main Road)
                  </RouteHighlight>
                );
              } else {
                nextStopDisplay = (
                  <RouteHighlight $isFull={false} $isUsingMainRoad={false}>
                    {bus.route[bus.currentStopIndex].name}
                  </RouteHighlight>
                );
              }
            } else if (isFull) {
              // Find next main stop
              let nextMainStopIndex = bus.currentStopIndex;
              for (let i = bus.currentStopIndex + 1; i < bus.route.length; i++) {
                if (bus.route[i].isMainStop) {
                  nextMainStopIndex = i;
                  break;
                }
              }
              if (nextMainStopIndex === bus.currentStopIndex) {
                // Look from the beginning if needed
                for (let i = 0; i < bus.currentStopIndex; i++) {
                  if (bus.route[i].isMainStop) {
                    nextMainStopIndex = i;
                    break;
                  }
                }
              }
              const nextMainStop = bus.route[nextMainStopIndex];
              nextStopDisplay = (
                <RouteHighlight $isFull={true} $isUsingMainRoad={false}>
                  {nextMainStop.name} (via Main Road)
                </RouteHighlight>
              );
            } else {
              // Normal movement
              let nextStopIndex;
              
              // Check if we're at the end of the route to determine direction
              if (bus.currentStopIndex === bus.route.length - 1) {
                // At the end, go backwards
                nextStopIndex = bus.currentStopIndex - 1;
              } else if (bus.currentStopIndex === 0) {
                // At start, go forwards
                nextStopIndex = 1;
              } else {
                // Normal movement in current direction
                nextStopIndex = isGoingForward ? bus.currentStopIndex + 1 : bus.currentStopIndex - 1;
              }
              
              if (nextStopIndex >= 0 && nextStopIndex < bus.route.length) {
                const nextStop = bus.route[nextStopIndex];
                nextStopDisplay = (
                  <RouteHighlight $isFull={false} $isUsingMainRoad={false}>
                    {nextStop.name}
                  </RouteHighlight>
                );
              } else {
                // Fallback if index is out of bounds
                nextStopDisplay = (
                  <RouteHighlight $isFull={false} $isUsingMainRoad={false}>
                    Unknown
                  </RouteHighlight>
                );
              }
            }

            return (
              <BusCard 
                key={bus.id}
                $isFull={isFull}
                $isMoving={isMoving}
                $isUsingMainRoad={isUsingMainRoad}
              >
                <BusHeader>
                  <BusId>{bus.id}</BusId>
                  <BusCapacity $isFull={isFull}>
                    {bus.currentPassengers}/{bus.capacity} Passengers
                  </BusCapacity>
                </BusHeader>
                
                <BusLocation>
                  {isMoving ? 'Moving to:' : 'Currently at:'} {currentStop.name}
                </BusLocation>
                
                <BusRoute>
                  Direction: <DirectionIndicator $isReverse={!isGoingForward}>
                    {isGoingForward 
                      ? 'Forward (Koramangala → Bellandur)' 
                      : 'Reverse (Bellandur → Koramangala)'}
                  </DirectionIndicator>
                </BusRoute>
                
                <BusRoute>
                  Next stop: {nextStopDisplay}
                </BusRoute>
                
                <BusStatus $isMoving={isMoving} $isUsingMainRoad={isUsingMainRoad}>
                  {isMoving 
                    ? (isUsingMainRoad ? 'Using Express Route' : 'Moving on Regular Road')
                    : 'Stopped'}
                </BusStatus>
                
                <BusControls>
                  <ControlButton 
                    color="#27ae60"
                    onClick={() => addPassenger(bus.id)}
                    disabled={isFull || isMoving || autoMode}
                  >
                    Board Passenger
                  </ControlButton>
                  
                  <ControlButton 
                    color="#e74c3c"
                    onClick={() => removePassenger(bus.id)}
                    disabled={bus.currentPassengers <= 0 || isMoving || autoMode}
                  >
                    Exit Passenger
                  </ControlButton>
                  
                  <ControlButton 
                    color="#3498db"
                    onClick={() => moveBusToNextStop(bus.id)}
                    disabled={isMoving || autoMode}
                  >
                    {isFull ? "Move (Direct)" : "Move Bus"}
                  </ControlButton>
                </BusControls>
              </BusCard>
            );
          })}
        </BusList>
      </PanelContainer>
    </>
  );
};

export default ControlPanel; 
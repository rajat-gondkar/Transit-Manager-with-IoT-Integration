import React from 'react';
import styled from 'styled-components';
import { Bus } from '../types';
import { useTransit } from '../context/TransitContext';

interface BusContainerProps {
  $isAtCapacity: boolean;
  $isMoving: boolean;
  $isUsingMainRoad: boolean;
}

const BusContainer = styled.div<BusContainerProps>`
  position: absolute;
  width: ${props => props.$isMoving ? '65px' : '60px'};
  height: ${props => props.$isMoving ? '32px' : '30px'};
  background: ${props => {
    if (props.$isAtCapacity) return 'linear-gradient(to bottom, #e74c3c, #c0392b)';
    if (props.$isMoving) return 'linear-gradient(to bottom, #f1c40f, #f39c12)';
    return 'linear-gradient(to bottom, #f39c12, #e67e22)';
  }};
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  transform: translate(-50%, -50%) ${props => props.$isMoving ? 'scale(1.05)' : ''};
  z-index: 15;
  box-shadow: ${props => {
    if (props.$isUsingMainRoad) return '0 0 15px rgba(231, 76, 60, 0.9), inset 0 0 5px rgba(255, 255, 255, 0.3)';
    if (props.$isMoving) return '0 0 10px rgba(241, 196, 15, 0.7), inset 0 0 5px rgba(255, 255, 255, 0.3)';
    return props.$isAtCapacity ? 
      '0 0 10px rgba(231, 76, 60, 0.7), inset 0 0 5px rgba(255, 255, 255, 0.3)' : 
      '0 3px 6px rgba(0, 0, 0, 0.3), inset 0 0 5px rgba(255, 255, 255, 0.3)';
  }};
  transition: all 0.2s ease;
  cursor: pointer;
  border: ${props => {
    if (props.$isUsingMainRoad) return '2px solid rgba(255, 255, 255, 0.6)';
    if (props.$isAtCapacity) return '2px solid rgba(255, 255, 255, 0.4)';
    return '2px solid rgba(255, 255, 255, 0.2)';
  }};
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  font-size: 16px;
`;

const BusInfo = styled.div`
  position: absolute;
  top: -35px;
  left: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 12px;
  color: #bbb;
  font-weight: bold;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
`;

const StatusIndicator = styled.div<{ $isAtCapacity: boolean; $isUsingMainRoad: boolean }>`
  position: absolute;
  top: -45px;
  left: 50%;
  transform: translateX(-50%);
  padding: 3px 8px;
  border-radius: 10px;
  font-size: 10px;
  background-color: ${props => props.$isUsingMainRoad ? 
    'rgba(231, 76, 60, 0.8)' : 
    props.$isAtCapacity ? 'rgba(231, 76, 60, 0.8)' : 'rgba(46, 204, 113, 0.8)'};
  color: white;
  font-weight: bold;
  white-space: nowrap;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.3);
`;

const MovementTrail = styled.div<{ $isUsingMainRoad: boolean }>`
  position: absolute;
  width: 50px;
  height: 6px;
  background: ${props => props.$isUsingMainRoad ? 
    'linear-gradient(to left, rgba(231, 76, 60, 0.9), rgba(231, 76, 60, 0))' :
    'linear-gradient(to left, rgba(241, 196, 15, 0.9), rgba(241, 196, 15, 0))'
  };
  transform-origin: right center;
  z-index: 14;
  border-radius: 3px;
`;

interface BusComponentProps {
  bus: Bus;
}

const BusComponent: React.FC<BusComponentProps> = ({ bus }) => {
  const { position, id, currentPassengers, capacity } = bus;
  const { busAnimations } = useTransit();
  
  const isAtCapacity = currentPassengers >= capacity;
  const currentStop = bus.route[bus.currentStopIndex];
  const animation = busAnimations[id] || { isMoving: false, isUsingMainRoad: false, progress: 0 };
  const { isMoving, isUsingMainRoad } = animation;
  
  // Calculate trail angle based on movement direction
  let trailAngle = 0;
  if (isMoving) {
    const { startPosition, endPosition } = animation;
    const dx = endPosition.x - startPosition.x;
    trailAngle = dx > 0 ? 180 : 0; // 180 degrees if moving right, 0 if moving left
  }
  
  return (
    <>
      {isMoving && (
        <MovementTrail 
          $isUsingMainRoad={isUsingMainRoad}
          style={{ 
            left: position.x,
            top: position.y,
            transform: `rotate(${trailAngle}deg)`,
          }} 
        />
      )}
      
      <BusContainer
        $isAtCapacity={isAtCapacity}
        $isMoving={isMoving}
        $isUsingMainRoad={isUsingMainRoad}
        style={{ 
          left: `${position.x}px`, 
          top: `${position.y}px`
        }}
        title={`${id} - ${isMoving ? 'Moving' : `At ${currentStop.name}`} - ${currentPassengers}/${capacity} passengers`}
      >
        {id}
        <BusInfo>
          {currentPassengers}/{capacity}
        </BusInfo>
        
        {!isMoving && isAtCapacity && (
          <StatusIndicator $isAtCapacity={isAtCapacity} $isUsingMainRoad={isUsingMainRoad}>
            FULL
          </StatusIndicator>
        )}
        
        {isMoving && isUsingMainRoad && (
          <StatusIndicator $isAtCapacity={isAtCapacity} $isUsingMainRoad={isUsingMainRoad}>
            EXPRESS
          </StatusIndicator>
        )}
      </BusContainer>
    </>
  );
};

export default BusComponent; 
import React from 'react';
import styled from 'styled-components';
import { Bus } from '../types';
import { useTransit } from '../context/TransitContext';

interface BusContainerProps {
  $isMoving: boolean;
  $isUsingMainRoad: boolean;
}

const BusContainer = styled.div<BusContainerProps>`
  position: absolute;
  width: ${props => props.$isMoving ? '65px' : '60px'};
  height: ${props => props.$isMoving ? '32px' : '30px'};
  background: ${props => {
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
    return '0 3px 6px rgba(0, 0, 0, 0.3), inset 0 0 5px rgba(255, 255, 255, 0.3)';
  }};
  transition: all 0.2s ease;
  cursor: pointer;
  border: ${props => {
    if (props.$isUsingMainRoad) return '2px solid rgba(255, 255, 255, 0.6)';
    return '2px solid rgba(255, 255, 255, 0.2)';
  }};
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  font-size: 16px;
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
  const { position, id } = bus;
  const { busAnimations } = useTransit();
  
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
        $isMoving={isMoving}
        $isUsingMainRoad={isUsingMainRoad}
        style={{ 
          left: `${position.x}px`, 
          top: `${position.y}px`
        }}
        title={`Bus ${id}`}
      >
        {id}
      </BusContainer>
    </>
  );
};

export default BusComponent; 
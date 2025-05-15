import React from 'react';
import styled from 'styled-components';
import { Position } from '../types';

interface RoadProps {
  $isMainRoad: boolean;
}

const Road = styled.div<RoadProps>`
  position: absolute;
  height: ${props => props.$isMainRoad ? '10px' : '4px'};
  background: ${props => props.$isMainRoad 
    ? 'linear-gradient(to right, #e74c3c, #c0392b)'
    : 'linear-gradient(to right, #777, #555)'};
  transform-origin: left center;
  z-index: ${props => props.$isMainRoad ? '2' : '1'};
  border-radius: ${props => props.$isMainRoad ? '5px' : '2px'};
  box-shadow: ${props => props.$isMainRoad
    ? '0 0 10px rgba(231, 76, 60, 0.7), inset 0 0 3px rgba(255, 255, 255, 0.3)'
    : '0 0 5px rgba(100, 100, 100, 0.5)'};
  opacity: ${props => props.$isMainRoad ? 1 : 0.7};
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: ${props => props.$isMainRoad 
      ? 'linear-gradient(to bottom, rgba(255, 255, 255, 0.2), transparent)'
      : 'none'};
    border-radius: inherit;
  }
`;

const RoadLabel = styled.div`
  position: absolute;
  padding: 4px 8px;
  background-color: rgba(20, 20, 20, 0.9);
  border-radius: 4px;
  font-size: 11px;
  font-weight: bold;
  color: #e74c3c;
  transform: translate(-50%, -50%);
  z-index: 3;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
  border: 1px solid #e74c3c;
  letter-spacing: 0.5px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
`;

interface RoadComponentProps {
  from: Position;
  to: Position;
  isMainRoad: boolean;
}

const RoadComponent: React.FC<RoadComponentProps> = ({ from, to, isMainRoad }) => {
  // Calculate the distance between the two points
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  
  // Calculate midpoint for label
  const midX = from.x + dx / 2;
  const midY = from.y + dy / 2;
  
  // For main roads, we'll offset them significantly up to create parallel roads
  const offsetY = isMainRoad ? -40 : 0;
  
  return (
    <>
      <Road 
        $isMainRoad={isMainRoad}
        style={{ 
          width: `${distance}px`,
          left: `${from.x}px`, 
          top: `${from.y + offsetY}px`,
          transform: `rotate(${angle}deg)`,
        }}
      />
      
      {isMainRoad && (
        <RoadLabel
          style={{
            left: `${midX}px`,
            top: `${midY + offsetY - 20}px`,
          }}
        >
          EXPRESS ROUTE
        </RoadLabel>
      )}
    </>
  );
};

export default RoadComponent; 
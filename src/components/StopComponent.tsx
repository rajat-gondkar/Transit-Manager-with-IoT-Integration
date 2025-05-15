import React from 'react';
import styled from 'styled-components';
import { Stop } from '../types';

interface StopProps {
  $isMainStop: boolean;
}

const StopCircle = styled.div<StopProps>`
  position: absolute;
  width: ${props => props.$isMainStop ? '35px' : '16px'};
  height: ${props => props.$isMainStop ? '35px' : '16px'};
  border-radius: 50%;
  background-color: ${props => props.$isMainStop ? '#4a90e2' : '#67c23a'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  transform: translate(-50%, -50%);
  z-index: 10;
  cursor: pointer;
  box-shadow: 0 0 10px ${props => props.$isMainStop ? 'rgba(74, 144, 226, 0.6)' : 'rgba(103, 194, 58, 0.5)'};
  transition: all 0.3s ease;
  border: 2px solid ${props => props.$isMainStop ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.3)'};
  font-size: ${props => props.$isMainStop ? '16px' : '10px'};

  &:hover {
    transform: translate(-50%, -50%) scale(1.1);
    box-shadow: 0 0 15px ${props => props.$isMainStop ? 'rgba(74, 144, 226, 0.9)' : 'rgba(103, 194, 58, 0.7)'};
  }
`;

const StopLabel = styled.div<{ $isMainStop: boolean }>`
  position: absolute;
  font-size: 12px;
  color: #bbb;
  font-weight: ${props => props.$isMainStop ? 'bold' : 'normal'};
  margin-top: 5px;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  background-color: rgba(30, 30, 30, 0.7);
  padding: 3px 8px;
  border-radius: 4px;
  transform: translateX(-50%);
  white-space: nowrap;
`;

interface StopComponentProps {
  stop: Stop;
  hideIntermediateNames?: boolean;
}

const StopComponent: React.FC<StopComponentProps> = ({ stop, hideIntermediateNames = false }) => {
  const { position, name, id, isMainStop } = stop;
  
  return (
    <>
      <StopCircle 
        $isMainStop={isMainStop}
        style={{ 
          left: `${position.x}px`, 
          top: `${position.y}px` 
        }}
        title={name}
      >
        {id}
      </StopCircle>
      
      {/* Only show labels for main stops if hideIntermediateNames is true */}
      {(!hideIntermediateNames || isMainStop) && (
        <StopLabel 
          $isMainStop={isMainStop}
          style={{ 
            left: `${position.x}px`, 
            top: `${position.y + (isMainStop ? 25 : 15)}px`
          }}
        >
          {name}
        </StopLabel>
      )}
    </>
  );
};

export default StopComponent; 
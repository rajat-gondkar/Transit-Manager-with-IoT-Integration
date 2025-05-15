import React from 'react';
import styled from 'styled-components';
import { useTransit } from '../context/TransitContext';
import StopComponent from './StopComponent';
import RoadComponent from './RoadComponent';
import BusComponent from './BusComponent';

const MapContainer = styled.div`
  position: relative;
  width: 1000px;
  height: 500px;
  background-color: #1e1e1e;
  border: 1px solid #333;
  margin: 20px auto;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  border-radius: 12px;
`;

const Legend = styled.div`
  position: absolute;
  top: 20px;
  right: 20px;
  background-color: rgba(30, 30, 30, 0.85);
  padding: 12px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
  font-size: 12px;
  z-index: 20;
  border: 1px solid #333;
  max-width: 180px;
`;

const LegendTitle = styled.div`
  font-weight: bold;
  margin-bottom: 8px;
  border-bottom: 1px solid #444;
  padding-bottom: 5px;
  color: #e0e0e0;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  color: #bbb;
`;

const LegendColor = styled.div<{ color: string }>`
  width: 16px;
  height: 16px;
  background-color: ${props => props.color};
  margin-right: 8px;
  border-radius: ${props => props.color === '#e74c3c' ? '3px' : '50%'};
  border: 1px solid rgba(255, 255, 255, 0.2);
`;

const TransitMap: React.FC = () => {
  const { mapData } = useTransit();
  const { stops, roads, buses } = mapData;

  return (
    <MapContainer>
      {/* Render roads first so they appear behind stops and buses */}
      {roads.map((road, index) => {
        const fromStop = stops.find(stop => stop.id === road.from);
        const toStop = stops.find(stop => stop.id === road.to);
        
        if (fromStop && toStop) {
          return (
            <RoadComponent 
              key={`${road.from}-${road.to}-${index}`}
              from={fromStop.position} 
              to={toStop.position} 
              isMainRoad={road.isMainRoad} 
            />
          );
        }
        return null;
      })}
      
      {/* Render stops */}
      {stops.map(stop => (
        <StopComponent 
          key={stop.id}
          stop={stop}
          hideIntermediateNames={true}
        />
      ))}
      
      {/* Render buses */}
      {buses.map(bus => (
        <BusComponent 
          key={bus.id}
          bus={bus}
        />
      ))}

      <Legend>
        <LegendTitle>Transit System</LegendTitle>
        <LegendItem>
          <LegendColor color="#4a90e2" />
          <span>Main Stop</span>
        </LegendItem>
        <LegendItem>
          <LegendColor color="#67c23a" />
          <span>Intermediate Stop</span>
        </LegendItem>
        <LegendItem>
          <LegendColor color="#e74c3c" />
          <span>Main Road</span>
        </LegendItem>
        <LegendItem>
          <LegendColor color="#aaa" />
          <span>Regular Road</span>
        </LegendItem>
        <LegendItem>
          <LegendColor color="#f39c12" />
          <span>Bus</span>
        </LegendItem>
        <LegendItem>
          <LegendColor color="#e74c3c" />
          <span>Full Bus</span>
        </LegendItem>
      </Legend>
    </MapContainer>
  );
};

export default TransitMap; 
import React from 'react';
import styled from 'styled-components';
import { TransitProvider } from './context/TransitContext';
import TransitMap from './components/TransitMap';
import ControlPanel from './components/ControlPanel';

const AppContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  background-color: #121212;
  min-height: 100vh;
`;

const Header = styled.header`
  text-align: center;
  margin-bottom: 30px;
`;

const Title = styled.h1`
  color: #e0e0e0;
  margin-bottom: 10px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  font-size: 2.5rem;
`;

const Subtitle = styled.p`
  color: #bbb;
  font-size: 1.2rem;
  max-width: 800px;
  margin: 0 auto;
`;

function App() {
  return (
    <TransitProvider>
      <AppContainer>
        <Header>
          <Title>Real-Time Public Transit Management System</Title>
          <Subtitle>Interactive Simulation with Dynamic Routing</Subtitle>
        </Header>
        
        <TransitMap />
        <ControlPanel />
      </AppContainer>
    </TransitProvider>
  );
}

export default App;

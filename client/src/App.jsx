import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { APP_CONFIG } from './config';
import CommandCenter from './pages/CommandCenter';
import SentimentHealth from './pages/SentimentHealth';
import Dashboard from './pages/Dashboard';
import PostPredictor from './pages/PostPredictor';
import MainLayout from './components/MainLayout';
import { FilterProvider } from './context/FilterContext';

function App() {
  return (
    <Router>
      <FilterProvider>
        <MainLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/chat" element={<CommandCenter />} />
            <Route path="/sentiment" element={<SentimentHealth />} />
            <Route path="/predictor" element={<PostPredictor />} />
          </Routes>
        </MainLayout>
      </FilterProvider>
    </Router>
  );
}

export default App;

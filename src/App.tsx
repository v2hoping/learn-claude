import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Architecture from './pages/Architecture';
import QuickStart from './pages/QuickStart';

function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen bg-gray-50 text-gray-900 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-white">
          <Routes>
            <Route path="/" element={<Navigate to="/architecture" replace />} />
            <Route path="/architecture" element={<Architecture />} />
            <Route path="/quick-start" element={<QuickStart />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;

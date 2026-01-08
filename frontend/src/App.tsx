import { Routes, Route, useLocation, Link } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import ArticlePage from './pages/Article';
import EntityGraph from './pages/EntityGraph';
import Stats from './pages/Stats';
import Facts from './pages/Facts';
import FactsWidget from './pages/FactsWidget';
import DataSources from './pages/DataSources';
import InstallPrompt from './components/InstallPrompt';
import { AdPlaceholder } from './components/AdBanner';

function App() {
  const location = useLocation();

  // Widget route gets its own standalone layout
  if (location.pathname === '/widget') {
    return (
      <>
        <FactsWidget />
        <InstallPrompt />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col overflow-x-hidden">
      <Header />

      {/* Top Banner Ad */}
      <div className="container mx-auto px-4 py-4">
        <AdPlaceholder type="banner" className="mx-auto max-w-3xl" />
      </div>

      <main className="container mx-auto px-4 py-4 flex-1 overflow-x-hidden">
        <div className="flex gap-6">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/article/:id" element={<ArticlePage />} />
              <Route path="/stats" element={<Stats />} />
              <Route path="/graph" element={<EntityGraph />} />
              <Route path="/facts" element={<Facts />} />
              <Route path="/sources" element={<DataSources />} />
            </Routes>
          </div>

          {/* Sidebar with Ads */}
          <aside className="hidden lg:block w-[300px] flex-shrink-0">
            <div className="sticky top-20 space-y-6">
              <AdPlaceholder type="sidebar" />
              <AdPlaceholder type="sidebar" />
            </div>
          </aside>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-dark-900 border-t border-dark-700 py-8 mt-8">
        <div className="container mx-auto px-4">
          <AdPlaceholder type="footer" className="mb-6 mx-auto max-w-3xl" />
          <div className="text-center text-gray-500 text-sm">
            <p className="font-medium text-gray-400">LatBot<span className="text-primary-500">.news</span></p>
            <p className="mt-1">Noticias LATAM con Inteligencia Artificial</p>
            <Link
              to="/sources"
              className="inline-block mt-3 text-primary-400 hover:text-primary-300 transition-colors"
            >
              Fuentes de Datos
            </Link>
          </div>
        </div>
      </footer>

      {/* PWA Install Prompt */}
      <InstallPrompt />
    </div>
  );
}

export default App;

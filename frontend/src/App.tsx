import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import ArticlePage from './pages/Article';
import { AdPlaceholder } from './components/AdBanner';

function App() {
  return (
    <div className="min-h-screen bg-dark-950 flex flex-col">
      <Header />

      {/* Top Banner Ad */}
      <div className="container mx-auto px-4 py-4">
        <AdPlaceholder type="banner" className="mx-auto" />
      </div>

      <main className="container mx-auto px-4 py-4 flex-1">
        <div className="flex gap-6">
          {/* Main Content */}
          <div className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/article/:id" element={<ArticlePage />} />
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
          <AdPlaceholder type="footer" className="mb-6 mx-auto" />
          <div className="text-center text-gray-500 text-sm">
            <p className="font-medium text-gray-400">LatBot<span className="text-primary-500">.news</span></p>
            <p className="mt-1">Noticias LATAM con Inteligencia Artificial</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;

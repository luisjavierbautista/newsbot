import { Search, Filter, X } from 'lucide-react';
import { useState } from 'react';
import type { ArticleFilters } from '../types';
import { biasLabels, toneLabels } from '../types';

interface FiltersProps {
  filters: ArticleFilters;
  onFiltersChange: (filters: ArticleFilters) => void;
}

export default function Filters({ filters, onFiltersChange }: FiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchValue, setSearchValue] = useState(filters.search || '');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onFiltersChange({ ...filters, search: searchValue, page: 1 });
  };

  const handleBiasChange = (bias: string) => {
    const currentBiases = filters.political_bias?.split(',').filter(Boolean) || [];
    const newBiases = currentBiases.includes(bias)
      ? currentBiases.filter((b) => b !== bias)
      : [...currentBiases, bias];
    onFiltersChange({
      ...filters,
      political_bias: newBiases.join(',') || undefined,
      page: 1,
    });
  };

  const handleToneChange = (tone: string) => {
    const currentTones = filters.tone?.split(',').filter(Boolean) || [];
    const newTones = currentTones.includes(tone)
      ? currentTones.filter((t) => t !== tone)
      : [...currentTones, tone];
    onFiltersChange({
      ...filters,
      tone: newTones.join(',') || undefined,
      page: 1,
    });
  };

  const clearFilters = () => {
    setSearchValue('');
    onFiltersChange({ page: 1, page_size: filters.page_size });
  };

  const hasActiveFilters = filters.search || filters.political_bias || filters.tone || filters.entity;

  const selectedBiases = filters.political_bias?.split(',').filter(Boolean) || [];
  const selectedTones = filters.tone?.split(',').filter(Boolean) || [];

  return (
    <div className="card p-4 mb-6">
      {/* Barra de búsqueda */}
      <form onSubmit={handleSearch} className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Buscar noticias..."
            className="input pl-10"
          />
        </div>
        <button type="submit" className="btn-primary">
          Buscar
        </button>
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className={`btn-secondary flex items-center gap-2 ${isExpanded ? 'bg-dark-600' : ''}`}
        >
          <Filter className="w-5 h-5" />
          <span className="hidden sm:inline">Filtros</span>
        </button>
      </form>

      {/* Filtros expandidos */}
      {isExpanded && (
        <div className="pt-4 border-t border-dark-700 space-y-4">
          {/* Sesgo político */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Sesgo Político del Medio
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(biasLabels).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => handleBiasChange(value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedBiases.includes(value)
                      ? 'bg-primary-600 text-white'
                      : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Tono */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tono de la Publicación
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(toneLabels).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => handleToneChange(value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedTones.includes(value)
                      ? 'bg-primary-600 text-white'
                      : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filtros activos */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 pt-4 border-t border-dark-700 mt-4">
          <span className="text-sm text-gray-400">Filtros activos:</span>
          <div className="flex flex-wrap gap-2">
            {filters.search && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-dark-700 rounded text-sm text-gray-300">
                Búsqueda: "{filters.search}"
                <button
                  onClick={() => {
                    setSearchValue('');
                    onFiltersChange({ ...filters, search: undefined, page: 1 });
                  }}
                  className="hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedBiases.map((bias) => (
              <span
                key={bias}
                className="inline-flex items-center gap-1 px-2 py-1 bg-dark-700 rounded text-sm text-gray-300"
              >
                {biasLabels[bias]}
                <button onClick={() => handleBiasChange(bias)} className="hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {selectedTones.map((tone) => (
              <span
                key={tone}
                className="inline-flex items-center gap-1 px-2 py-1 bg-dark-700 rounded text-sm text-gray-300"
              >
                {toneLabels[tone]}
                <button onClick={() => handleToneChange(tone)} className="hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {filters.entity && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-dark-700 rounded text-sm text-gray-300">
                Entidad: {filters.entity}
                <button
                  onClick={() => onFiltersChange({ ...filters, entity: undefined, page: 1 })}
                  className="hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
          <button onClick={clearFilters} className="text-sm text-primary-400 hover:text-primary-300 ml-auto">
            Limpiar todo
          </button>
        </div>
      )}
    </div>
  );
}

import { User, MapPin, Building2, Calendar, Globe, Building } from 'lucide-react';
import type { Entity } from '../types';
import { entityTypeLabels } from '../types';

interface EntityTagsProps {
  entities: Entity[];
  onEntityClick?: (entity: Entity) => void;
  maxVisible?: number;
}

const entityIcons: Record<string, React.ReactNode> = {
  person: <User className="w-3 h-3" />,
  place: <MapPin className="w-3 h-3" />,
  organization: <Building2 className="w-3 h-3" />,
  date: <Calendar className="w-3 h-3" />,
  country: <Globe className="w-3 h-3" />,
  city: <Building className="w-3 h-3" />,
};

const entityColors: Record<string, string> = {
  person: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  place: 'bg-green-500/20 text-green-300 border-green-500/30',
  organization: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  date: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  country: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  city: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
};

export default function EntityTags({ entities, onEntityClick, maxVisible = 5 }: EntityTagsProps) {
  const visibleEntities = entities.slice(0, maxVisible);
  const remainingCount = entities.length - maxVisible;

  if (entities.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {visibleEntities.map((entity) => (
        <button
          key={entity.id}
          onClick={() => onEntityClick?.(entity)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-opacity hover:opacity-80 ${
            entityColors[entity.entity_type] || 'bg-gray-500/20 text-gray-300 border-gray-500/30'
          }`}
          title={`${entityTypeLabels[entity.entity_type] || entity.entity_type}: ${entity.entity_value}`}
        >
          {entityIcons[entity.entity_type]}
          <span className="max-w-[120px] truncate">{entity.entity_value}</span>
        </button>
      ))}
      {remainingCount > 0 && (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-dark-700 text-gray-400 border border-dark-600">
          +{remainingCount} más
        </span>
      )}
    </div>
  );
}

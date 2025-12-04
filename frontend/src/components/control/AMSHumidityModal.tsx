import { useEffect } from 'react';
import { X } from 'lucide-react';

interface AMSHumidityModalProps {
  humidity: number;
  temperature: number;
  dryingStatus: 'idle' | 'drying';
  remainingTime?: number; // in minutes
  onClose: () => void;
}

// Single humidity icon that fills based on level (larger version for modal)
function HumidityIconLarge({ humidity }: { humidity: number }) {
  const getIconSrc = (): string => {
    if (humidity < 25) return '/icons/humidity-empty.svg';
    if (humidity < 40) return '/icons/humidity-half.svg';
    return '/icons/humidity-full.svg';
  };

  return (
    <img
      src={getIconSrc()}
      alt=""
      className="w-16 h-24"
    />
  );
}

export function AMSHumidityModal({
  humidity,
  temperature,
  dryingStatus,
  remainingTime,
  onClose,
}: AMSHumidityModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const formatRemainingTime = () => {
    if (dryingStatus === 'idle') return 'Idle';
    if (!remainingTime) return 'Drying...';
    const hours = Math.floor(remainingTime / 60);
    const mins = remainingTime % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-bambu-dark-secondary rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-bambu-dark-tertiary">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Current AMS humidity</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-bambu-dark-tertiary rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-bambu-gray" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Large humidity icon */}
          <div className="flex flex-col items-center mb-6">
            <HumidityIconLarge humidity={humidity} />
            <div className="flex items-center gap-2 mt-2 text-gray-600 dark:text-bambu-gray">
              <span className="text-yellow-500">❊</span>
              <span>{dryingStatus === 'idle' ? 'Idle' : 'Drying'}</span>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-sm text-gray-500 dark:text-bambu-gray mb-1">Humidity</div>
              <div className="text-lg font-medium text-gray-900 dark:text-white">{humidity}%</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 dark:text-bambu-gray mb-1">Temperature</div>
              <div className="text-lg font-medium text-gray-900 dark:text-white">{temperature} °C</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 dark:text-bambu-gray mb-1">Remaining Time</div>
              <div className="text-lg font-medium text-gray-900 dark:text-white">{formatRemainingTime()}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

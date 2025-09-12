import React from 'react';
import { Clock } from 'lucide-react';

interface PauseIndicatorProps {
  duration: string;
  description: string;
}

export const PauseIndicator: React.FC<PauseIndicatorProps> = ({
  duration,
  description
}) => {
  return (
    <div className="flex justify-center py-4">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 flex items-center space-x-3">
        <Clock className="w-5 h-5 text-yellow-600" />
        <div className="text-center">
          <div className="text-sm font-medium text-yellow-800">
            {description || '等待中...'}
          </div>
          <div className="text-xs text-yellow-600 mt-1">
            {duration}
          </div>
        </div>
      </div>
    </div>
  );
};
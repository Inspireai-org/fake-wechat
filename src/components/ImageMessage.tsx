import React, { useState } from 'react';
import { Message, Participant } from './ChatInterface';

interface ImageMessageProps {
  message: Message;
  participant: Participant | null;
  isCurrentUser: boolean;
}

export const ImageMessage: React.FC<ImageMessageProps> = ({
  message,
  participant,
  isCurrentUser
}) => {
  const [imagesLoaded, setImagesLoaded] = useState<Set<number>>(new Set());
  
  const imageUrls = Array.isArray(message.imageUrl) 
    ? message.imageUrl 
    : message.imageUrl 
    ? [message.imageUrl] 
    : [];

  const handleImageLoad = (index: number) => {
    setImagesLoaded(prev => new Set(prev).add(index));
  };

  const renderImages = () => {
    const imageCount = imageUrls.length;
    
    if (imageCount === 0) return null;
    
    if (imageCount === 1) {
      return (
        <div className="relative">
          <img
            src={imageUrls[0]}
            alt={message.imageDescription || 'Image'}
            className={`rounded-lg max-w-[180px] max-h-[240px] object-cover transition-opacity duration-300 ${
              imagesLoaded.has(0) ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => handleImageLoad(0)}
          />
          {!imagesLoaded.has(0) && (
            <div className="absolute inset-0 bg-gray-200 rounded-lg animate-pulse" />
          )}
        </div>
      );
    }
    
    if (imageCount === 2) {
      return (
        <div className="flex space-x-1">
          {imageUrls.map((url, index) => (
            <div key={index} className="relative">
              <img
                src={url}
                alt={`Image ${index + 1}`}
                className={`rounded-lg w-[88px] h-[88px] object-cover transition-opacity duration-300 ${
                  imagesLoaded.has(index) ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={() => handleImageLoad(index)}
              />
              {!imagesLoaded.has(index) && (
                <div className="absolute inset-0 bg-gray-200 rounded-lg animate-pulse" />
              )}
            </div>
          ))}
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-3 gap-1 max-w-[180px]">
        {imageUrls.slice(0, 9).map((url, index) => (
          <div key={index} className="relative">
            <img
              src={url}
              alt={`Image ${index + 1}`}
              className={`rounded w-[58px] h-[58px] object-cover transition-opacity duration-300 ${
                imagesLoaded.has(index) ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => handleImageLoad(index)}
            />
            {!imagesLoaded.has(index) && (
              <div className="absolute inset-0 bg-gray-200 rounded animate-pulse" />
            )}
          </div>
        ))}
      </div>
    );
  };

  if (isCurrentUser) {
    return (
      <div className="flex items-start justify-end space-x-2">
        <div className="flex flex-col items-end">
          {renderImages()}
          {message.imageDescription && (
            <div className="mt-1 bg-[#95EC69] text-black rounded-lg px-2.5 py-1.5 max-w-[180px] text-sm">
              {message.imageDescription}
            </div>
          )}
        </div>
        <div className="w-7 h-7 rounded-md bg-gray-300 flex-shrink-0 overflow-hidden">
          {participant?.avatar && (
            <img 
              src={participant.avatar} 
              alt={participant.name}
              className="w-full h-full object-cover"
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start space-x-2">
      <div className="w-7 h-7 rounded-md bg-gray-300 flex-shrink-0 overflow-hidden">
        {participant?.avatar && (
          <img 
            src={participant.avatar} 
            alt={participant.name}
            className="w-full h-full object-cover"
          />
        )}
      </div>
      <div className="flex flex-col">
        {renderImages()}
        {message.imageDescription && (
          <div className="mt-1 bg-white text-black rounded-lg px-2.5 py-1.5 max-w-[180px] text-sm">
            {message.imageDescription}
          </div>
        )}
      </div>
    </div>
  );
};
import React from 'react';

interface TimeStampProps {
  time: string;
}

export const TimeStamp: React.FC<TimeStampProps> = ({ time }) => {
  return (
    <div className="flex justify-center my-2">
      <span className="text-[12px] text-[#999999] px-2 py-1">
        {time}
      </span>
    </div>
  );
};
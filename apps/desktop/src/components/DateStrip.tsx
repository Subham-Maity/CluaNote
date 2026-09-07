import React from "react";
import {
  format,
  addDays,
  subDays,
  isToday,
  parseISO,
  startOfWeek,
} from "date-fns";
import clsx from "clsx";

interface DateStripProps {
  selectedDate: string; // 'YYYY-MM-DD'
  onSelectDate: (dateStr: string) => void;
}

export const DateStrip: React.FC<DateStripProps> = ({
  selectedDate,
  onSelectDate,
}) => {
  const currentDateObj = parseISO(selectedDate);
  const weekStart = startOfWeek(currentDateObj, { weekStartsOn: 1 }); // Monday start

  // Generate 7 days around the current week
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const handlePrevDay = () => {
    const prev = subDays(currentDateObj, 1);
    onSelectDate(format(prev, "yyyy-MM-dd"));
  };

  const handleNextDay = () => {
    const next = addDays(currentDateObj, 1);
    onSelectDate(format(next, "yyyy-MM-dd"));
  };

  const handleJumpToday = () => {
    onSelectDate(format(new Date(), "yyyy-MM-dd"));
  };

  return (
    <div className="px-4 py-3 border-b border-white/[0.07] bg-white/[0.02] backdrop-blur-md">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <h2 className="text-sm font-semibold text-white/90">
            {format(currentDateObj, "MMMM yyyy")}
          </h2>
          {!isToday(currentDateObj) && (
            <button
              onClick={handleJumpToday}
              className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 transition-colors font-medium"
            >
              Today
            </button>
          )}
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={handlePrevDay}
            className="w-7 h-7 rounded-lg glass-button flex items-center justify-center text-white/70 hover:text-white"
            title="Previous Day"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <button
            onClick={handleNextDay}
            className="w-7 h-7 rounded-lg glass-button flex items-center justify-center text-white/70 hover:text-white"
            title="Next Day"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* 7-day horizontal strip */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none touch-pan-x">
        {days.map((d) => {
          const dateStr = format(d, "yyyy-MM-dd");
          const isSelected = dateStr === selectedDate;
          const isDayToday = isToday(d);

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => onSelectDate(dateStr)}
              className={clsx(
                "flex-1 min-w-[42px] shrink-0 py-2 px-1.5 rounded-xl flex flex-col items-center justify-center transition-all duration-200 cursor-pointer",
                isSelected
                  ? "bg-indigo-600/90 text-white shadow-lg shadow-indigo-500/30 scale-[1.02] border border-indigo-400/40"
                  : "bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white border border-white/[0.06]"
              )}
            >
              <span className="text-[10px] font-medium tracking-wide uppercase opacity-80">
                {format(d, "EEE")}
              </span>
              <span
                className={clsx(
                  "text-sm font-bold mt-0.5",
                  isDayToday && !isSelected && "text-indigo-400"
                )}
              >
                {format(d, "d")}
              </span>
              {isDayToday && (
                <span
                  className={clsx(
                    "w-1 h-1 rounded-full mt-1",
                    isSelected ? "bg-white" : "bg-indigo-400"
                  )}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

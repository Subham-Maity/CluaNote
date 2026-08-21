import React, { useState, useEffect } from "react";
import type { Task } from "../types/task";
import { TaskCard } from "./TaskCard";
import { isToday, parseISO } from "date-fns";

interface TimelineProps {
  selectedDate: string; // 'YYYY-MM-DD'
  tasks: Task[]; // Timed tasks for the selected date
  onToggleComplete: (id: number, completed: boolean) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: number) => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  selectedDate,
  tasks,
  onToggleComplete,
  onEdit,
  onDelete,
}) => {
  const [now, setNow] = useState(new Date());
  const isSelectedToday = isToday(parseISO(selectedDate));

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Generate hours from 06:00 to 23:00
  const hours = Array.from({ length: 18 }, (_, i) => i + 6);

  // Group tasks by hour string 'HH'
  const tasksByHour = tasks.reduce<Record<number, Task[]>>((acc, task) => {
    if (task.time) {
      const hourPart = parseInt(task.time.split(":")[0], 10);
      if (!acc[hourPart]) {
        acc[hourPart] = [];
      }
      acc[hourPart].push(task);
    }
    return acc;
  }, {});

  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  return (
    <div className="relative px-4 py-3 flex-1 overflow-y-auto">
      <div className="space-y-4 relative">
        {hours.map((hour) => {
          const hourLabel = `${hour.toString().padStart(2, "0")}:00`;
          const hourTasks = tasksByHour[hour] || [];
          const isCurrentHour = isSelectedToday && currentHour === hour;

          return (
            <div key={hour} className="relative flex items-start space-x-3">
              {/* Hour Label */}
              <div className="w-12 pt-1 text-right flex-shrink-0">
                <span className="text-[11px] font-mono font-medium text-white/40">
                  {hourLabel}
                </span>
              </div>

              {/* Timeline slot & Tasks */}
              <div className="flex-1 min-h-[38px] pb-2 border-t border-white/[0.06] pt-1">
                {/* Current time line inside current hour */}
                {isCurrentHour && (
                  <div
                    className="absolute left-14 right-0 flex items-center z-10 pointer-events-none"
                    style={{
                      top: `${((currentMinute / 60) * 100).toFixed(0)}%`,
                    }}
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-md shadow-indigo-500/80 animate-pulse-glow" />
                    <div className="flex-1 h-[1.5px] bg-gradient-to-r from-indigo-500 to-indigo-500/20 shadow-sm shadow-indigo-500/40" />
                  </div>
                )}

                {hourTasks.length > 0 ? (
                  <div className="space-y-2 pt-1">
                    {hourTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onToggleComplete={onToggleComplete}
                        onEdit={onEdit}
                        onDelete={onDelete}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="h-6" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

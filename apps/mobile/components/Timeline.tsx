import React, { useState, useEffect } from "react";
import { View, Text } from "react-native";
import { isToday, parseISO } from "date-fns";
import { TaskCard } from "./TaskCard";
import type { Task } from "@cluanote/shared";

interface TimelineProps {
  selectedDate: string; // 'YYYY-MM-DD'
  tasks: Task[]; // Timed tasks for the selected date
  onToggleComplete: (id: number, completed: boolean) => void;
  onSetStatus?: (id: number, status: number) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: number) => void;
  onOpenNote?: (task: Task) => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  selectedDate,
  tasks,
  onToggleComplete,
  onSetStatus,
  onEdit,
  onDelete,
  onOpenNote,
}) => {
  const [now, setNow] = useState(new Date());
  const isSelectedToday = isToday(parseISO(selectedDate));

  // Update current time every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Standard hours from 06:00 to 23:00 (expanded if tasks exist outside this range)
  const baseHours = Array.from({ length: 18 }, (_, i) => i + 6); // 6 to 23
  const tasksByHour = tasks.reduce<Record<number, Task[]>>((acc, task) => {
    if (task.time) {
      const hourPart = parseInt(task.time.split(":")[0], 10);
      if (!acc[hourPart]) acc[hourPart] = [];
      acc[hourPart].push(task);
    }
    return acc;
  }, {});

  // Include any extra early morning hours (0..5) if tasks are present
  const allHours = Array.from(
    new Set([...baseHours, ...Object.keys(tasksByHour).map(Number)])
  ).sort((a, b) => a - b);

  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  return (
    <View className="pb-10">
      {allHours.map((hour) => {
        const hourLabel = `${hour.toString().padStart(2, "0")}:00`;
        const hourTasks = tasksByHour[hour] || [];
        const isCurrentHour = isSelectedToday && currentHour === hour;

        return (
          <View key={hour} className="relative mb-3">
            {/* Hour Header Row */}
            <View className="flex-row items-center space-x-2 mb-1.5">
              <Text
                className={`text-[11px] font-mono font-semibold w-12 ${
                  isCurrentHour ? "text-indigo-400 font-bold" : "text-slate-500"
                }`}
              >
                {hourLabel}
              </Text>
              <View
                className={`flex-1 h-[1px] ${
                  isCurrentHour ? "bg-indigo-500/60" : "bg-white/[0.06]"
                }`}
              />
            </View>

            {/* Current Time Indicator Line */}
            {isCurrentHour && (
              <View
                className="flex-row items-center my-1 ml-12"
                style={{ opacity: 0.9 }}
              >
                <View className="w-2 h-2 rounded-full bg-indigo-500 shadow-lg shadow-indigo-500" />
                <View className="flex-1 h-[1.5px] bg-indigo-500" />
                <Text className="text-[9px] font-mono text-indigo-400 ml-1.5">
                  {now.toTimeString().slice(0, 5)}
                </Text>
              </View>
            )}

            {/* Tasks in this hour */}
            {hourTasks.length > 0 ? (
              <View className="ml-12 space-y-2">
                {hourTasks.map((task) => (
                  <TaskCard
                    key={task.uuid || String(task.id)}
                    task={task}
                    onToggleComplete={onToggleComplete}
                    onSetStatus={onSetStatus}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onOpenNote={onOpenNote}
                  />
                ))}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
};

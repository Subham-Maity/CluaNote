import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TaskCard } from "./TaskCard";
import type { Task } from "@cluanote/shared";

interface AnytimeSectionProps {
  tasks: Task[];
  onToggleComplete: (id: number, completed: boolean) => void;
  onSetStatus?: (id: number, status: number) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: number) => void;
  onOpenNote?: (task: Task) => void;
}

export const AnytimeSection: React.FC<AnytimeSectionProps> = ({
  tasks,
  onToggleComplete,
  onSetStatus,
  onEdit,
  onDelete,
  onOpenNote,
}) => {
  if (tasks.length === 0) {
    return null;
  }

  return (
    <View className="mb-4">
      {/* Section Header */}
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center space-x-1.5">
          <Ionicons name="time-outline" size={14} color="#818cf8" />
          <Text className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Anytime Today
          </Text>
          <View className="px-1.5 py-0.2 rounded-full bg-white/[0.08]">
            <Text className="text-[10px] font-mono font-bold text-slate-300">
              {tasks.length}
            </Text>
          </View>
        </View>
      </View>

      {/* Task Cards */}
      {tasks.map((task) => (
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
  );
};

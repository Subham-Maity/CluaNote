import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Task } from "@cluanote/shared";

interface TaskCardProps {
  task: Task;
  onToggleComplete: (id: number, completed: boolean) => void;
  onSetStatus?: (id: number, status: number) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: number) => void;
  onOpenNote?: (task: Task) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onToggleComplete,
  onSetStatus,
  onEdit,
  onDelete,
  onOpenNote,
}) => {
  const [showActions, setShowActions] = useState(false);
  const isCompleted = task.completed === 1;
  const isNotDone = task.completed === 2;

  const handleCheckbox = () => {
    if (onSetStatus) {
      if (task.completed === 0) {
        onSetStatus(task.id, 1);
      } else {
        onSetStatus(task.id, 0);
      }
    } else {
      onToggleComplete(task.id, !isCompleted);
    }
  };

  const priorityColor = {
    high: "bg-rose-500",
    medium: "bg-amber-400",
    low: "bg-emerald-400",
  }[task.priority || "medium"];

  return (
    <View
      className={`mb-2.5 rounded-2xl border transition-all ${
        isCompleted
          ? "bg-white/[0.02] border-white/[0.05] opacity-50"
          : isNotDone
          ? "bg-rose-950/20 border-rose-500/30"
          : "bg-white/[0.04] border-white/[0.08]"
      }`}
    >
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onEdit(task)}
        onLongPress={() => setShowActions(!showActions)}
        className="p-3.5 flex-row items-start justify-between"
      >
        {/* Left: Checkbox & Task details */}
        <View className="flex-row items-start flex-1 pr-2">
          {/* Checkbox */}
          <TouchableOpacity
            onPress={handleCheckbox}
            className={`w-5 h-5 mt-0.5 rounded-lg border items-center justify-center mr-3 ${
              isCompleted
                ? "bg-indigo-600 border-indigo-400"
                : isNotDone
                ? "bg-rose-500/20 border-rose-500"
                : "border-slate-500 bg-white/[0.04]"
            }`}
          >
            {isCompleted && (
              <Ionicons name="checkmark" size={13} color="white" />
            )}
            {isNotDone && (
              <Ionicons name="close" size={13} color="#f43f5e" />
            )}
          </TouchableOpacity>

          {/* Title & Note */}
          <View className="flex-1">
            <View className="flex-row items-center space-x-1.5 flex-wrap">
              <Text
                className={`text-sm font-medium leading-snug ${
                  isCompleted
                    ? "text-slate-500 line-through"
                    : isNotDone
                    ? "text-rose-200"
                    : "text-white"
                }`}
              >
                {task.title}
              </Text>
            </View>

            {task.note ? (
              <TouchableOpacity
                onPress={() => onOpenNote?.(task)}
                className="mt-1"
              >
                <Text
                  className="text-xs text-slate-400 line-clamp-2 leading-relaxed"
                  numberOfLines={2}
                >
                  {task.note}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Right: Badges & Priority Dot */}
        <View className="items-end space-y-1">
          <View className="flex-row items-center space-x-1.5">
            {task.time ? (
              <View className="px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/[0.08]">
                <Text className="text-[10px] font-mono font-semibold text-indigo-300">
                  {task.time}
                </Text>
              </View>
            ) : null}

            {/* Priority dot */}
            <View className={`w-2 h-2 rounded-full ${priorityColor}`} />
          </View>

          {isNotDone && (
            <View className="px-1.5 py-0.2 rounded bg-rose-500/20 border border-rose-500/30">
              <Text className="text-[9px] font-bold uppercase text-rose-300">
                Not Done
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* Inline Quick Action Bar on Long Press */}
      {showActions && (
        <View className="px-3 py-2 border-t border-white/[0.06] bg-black/20 flex-row items-center justify-between">
          <View className="flex-row space-x-1">
            <TouchableOpacity
              onPress={() => {
                onSetStatus ? onSetStatus(task.id, 1) : onToggleComplete(task.id, true);
                setShowActions(false);
              }}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex-row items-center space-x-1"
            >
              <Ionicons name="checkmark" size={12} color="#34d399" />
              <Text className="text-emerald-300 text-[11px] font-semibold">Done</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                onSetStatus?.(task.id, 2);
                setShowActions(false);
              }}
              className="px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-500/30 flex-row items-center space-x-1"
            >
              <Ionicons name="close" size={12} color="#fb7185" />
              <Text className="text-rose-300 text-[11px] font-semibold">Missed</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                onEdit(task);
                setShowActions(false);
              }}
              className="px-2.5 py-1 rounded-lg bg-white/[0.06] border border-white/[0.1] flex-row items-center space-x-1"
            >
              <Ionicons name="pencil" size={12} color="#94a3b8" />
              <Text className="text-slate-300 text-[11px] font-semibold">Edit</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => {
              onDelete(task.id);
              setShowActions(false);
            }}
            className="p-1 rounded-lg bg-rose-500/10"
          >
            <Ionicons name="trash-outline" size={14} color="#f43f5e" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

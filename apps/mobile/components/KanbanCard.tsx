import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import type { Task } from "@cluanote/shared";

export type KanbanStatus = "todo" | "doing" | "done";

interface KanbanCardProps {
  task: Task;
  currentStatus: KanbanStatus;
  onPress: (task: Task) => void;
  onPushToEvent: (task: Task) => void;
  onMoveStatus: (task: Task, target: KanbanStatus) => void;
  onDelete: (task: Task) => void;
  drag?: () => void;
  isActive?: boolean;
}

const PRIORITY_META: Record<
  string,
  { dot: string; text: string; bg: string; border: string }
> = {
  high: {
    dot: "bg-rose-500",
    text: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
  },
  medium: {
    dot: "bg-amber-400",
    text: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
  },
  low: {
    dot: "bg-emerald-400",
    text: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
  },
};

export const KanbanCard: React.FC<KanbanCardProps> = ({
  task,
  currentStatus,
  onPress,
  onPushToEvent,
  onMoveStatus,
  onDelete,
  drag,
  isActive = false,
}) => {
  const priority = PRIORITY_META[task.priority] || PRIORITY_META.low;

  const formatDate = (d: string) => {
    try {
      return format(parseISO(d), "MMM d, yyyy");
    } catch {
      return d;
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(task)}
      onLongPress={drag}
      className={`mb-3 p-3.5 rounded-2xl border ${
        isActive
          ? "bg-indigo-950/80 border-indigo-500 shadow-xl scale-[1.02]"
          : "bg-white/[0.04] border-white/[0.08]"
      }`}
    >
      {/* Card Header: Priority dot, Title, Drag handle */}
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-row items-center gap-2 flex-1 pr-2">
          <View className={`w-2.5 h-2.5 rounded-full ${priority.dot}`} />
          <Text
            className="text-white text-sm font-bold flex-1"
            numberOfLines={2}
          >
            {task.title}
          </Text>
        </View>

        {drag && (
          <TouchableOpacity
            onLongPress={drag}
            delayLongPress={100}
            className="p-1 -mr-1"
            accessibilityLabel="Drag card to reorder"
          >
            <Ionicons name="reorder-two-outline" size={18} color="#64748b" />
          </TouchableOpacity>
        )}
      </View>

      {/* Note Snippet */}
      {task.note ? (
        <View className="p-2.5 rounded-xl bg-black/25 border border-white/[0.04] mb-2.5">
          <Text
            className="text-slate-300 text-xs leading-relaxed"
            numberOfLines={2}
          >
            {task.note}
          </Text>
        </View>
      ) : null}

      {/* Badges: Target Date & Priority */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="calendar-outline" size={13} color="#94a3b8" />
          <Text className="text-slate-400 text-xs">
            {formatDate(task.date)}
            {task.time ? ` · ${task.time}` : ""}
          </Text>
        </View>

        <View
          className={`px-2 py-0.5 rounded-full border ${priority.bg} ${priority.border}`}
        >
          <Text className={`text-[10px] font-bold uppercase ${priority.text}`}>
            {task.priority}
          </Text>
        </View>
      </View>

      {/* Card Actions Footer */}
      <View className="flex-row items-center justify-between pt-2 border-t border-white/[0.06]">
        {/* Push to Event Button */}
        <TouchableOpacity
          onPress={() => onPushToEvent(task)}
          className="flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-600/20 border border-indigo-500/30 active:bg-indigo-600/30"
          accessibilityLabel="Promote future note to calendar event"
        >
          <Ionicons name="arrow-forward-circle-outline" size={14} color="#818cf8" />
          <Text className="text-[11px] font-bold text-indigo-300">
            Push to Day
          </Text>
        </TouchableOpacity>

        {/* Column Switcher Pills */}
        <View className="flex-row items-center gap-1">
          {currentStatus === "todo" && (
            <TouchableOpacity
              onPress={() => onMoveStatus(task, "doing")}
              className="px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 active:bg-amber-500/25 flex-row items-center gap-1"
            >
              <Text className="text-[10px] font-bold text-amber-300">Start</Text>
              <Ionicons name="arrow-forward" size={11} color="#fcd34d" />
            </TouchableOpacity>
          )}

          {currentStatus === "doing" && (
            <>
              <TouchableOpacity
                onPress={() => onMoveStatus(task, "todo")}
                className="px-1.5 py-1 rounded-lg bg-white/[0.05] border border-white/[0.08] active:bg-white/[0.1]"
              >
                <Ionicons name="arrow-back" size={11} color="#94a3b8" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onMoveStatus(task, "done")}
                className="px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 active:bg-emerald-500/25 flex-row items-center gap-1"
              >
                <Text className="text-[10px] font-bold text-emerald-300">Done</Text>
                <Ionicons name="checkmark" size={11} color="#6ee7b7" />
              </TouchableOpacity>
            </>
          )}

          {currentStatus === "done" && (
            <TouchableOpacity
              onPress={() => onMoveStatus(task, "todo")}
              className="px-2 py-1 rounded-lg bg-slate-500/10 border border-slate-500/20 active:bg-slate-500/25 flex-row items-center gap-1"
            >
              <Ionicons name="refresh" size={11} color="#94a3b8" />
              <Text className="text-[10px] font-bold text-slate-300">Reopen</Text>
            </TouchableOpacity>
          )}

          {/* Delete Note */}
          <TouchableOpacity
            onPress={() => onDelete(task)}
            className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 active:bg-rose-500/25 ml-1"
            accessibilityLabel="Delete note"
          >
            <Ionicons name="trash-outline" size={13} color="#f43f5e" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

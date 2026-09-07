import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import type { Task } from "@cluanote/shared";

interface ReminderBannerProps {
  tasks: Task[];
  onDismissTask: (taskId: number) => void;
  onDismissAll: () => void;
  onMarkDone: (task: Task) => void;
  onMarkNotDone: (task: Task) => void;
  onJumpToDate?: (date: string) => void;
}

function getColorScheme(count: number) {
  if (count >= 5) {
    return {
      containerBg: "bg-rose-950/70",
      border: "border-rose-500/40",
      badgeBg: "bg-rose-500",
      alertText: "text-rose-300",
      dotBg: "bg-rose-400",
      alertTitle: "🔴 High Priority Yesterday",
      cardBg: "bg-rose-950/40",
      cardBorder: "border-rose-500/20",
    };
  }
  if (count >= 3) {
    return {
      containerBg: "bg-amber-950/70",
      border: "border-amber-500/40",
      badgeBg: "bg-amber-500",
      alertText: "text-amber-300",
      dotBg: "bg-amber-400",
      alertTitle: "🟠 Overdue From Yesterday",
      cardBg: "bg-amber-950/40",
      cardBorder: "border-amber-500/20",
    };
  }
  return {
    containerBg: "bg-emerald-950/70",
    border: "border-emerald-500/40",
    badgeBg: "bg-emerald-600",
    alertText: "text-emerald-300",
    dotBg: "bg-emerald-400",
    alertTitle: "🟢 From Yesterday",
    cardBg: "bg-emerald-950/40",
    cardBorder: "border-emerald-500/20",
  };
}

const PRIORITY_COLOR: Record<string, string> = {
  high: "bg-rose-400",
  medium: "bg-amber-400",
  low: "bg-emerald-400",
};

export const ReminderBanner: React.FC<ReminderBannerProps> = ({
  tasks,
  onDismissTask,
  onDismissAll,
  onMarkDone,
  onMarkNotDone,
  onJumpToDate,
}) => {
  if (tasks.length === 0) return null;

  const colors = getColorScheme(tasks.length);
  const screenWidth = Dimensions.get("window").width;
  // Card width for horizontal scroll
  const cardWidth = tasks.length === 1 ? screenWidth - 48 : screenWidth - 72;

  const formatTaskDate = (d: string) => {
    try {
      return format(parseISO(d), "MMM d");
    } catch {
      return d;
    }
  };

  return (
    <View
      className={`mx-3 mt-2 rounded-2xl border ${colors.border} ${colors.containerBg} overflow-hidden p-3 shadow-lg`}
    >
      {/* Top Banner Header: Status + Badge + Dismiss All */}
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center space-x-2">
          <View className={`w-2 h-2 rounded-full ${colors.dotBg}`} />
          <Text
            className={`text-[11px] font-bold uppercase tracking-wider ${colors.alertText}`}
          >
            {colors.alertTitle}
          </Text>
        </View>

        <View className="flex-row items-center space-x-2">
          <View
            className={`px-2 py-0.5 rounded-full ${colors.badgeBg} shadow-sm`}
          >
            <Text className="text-[10px] font-bold text-white">
              {tasks.length} pending
            </Text>
          </View>

          <TouchableOpacity
            onPress={onDismissAll}
            className="flex-row items-center space-x-1 px-1.5 py-0.5 rounded-lg bg-white/[0.08]"
            accessibilityLabel="Dismiss all reminders"
          >
            <Ionicons name="close" size={13} color="#cbd5e1" />
            <Text className="text-[10px] text-slate-300 font-medium">
              Dismiss All
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Horizontal Scroll of Reminder Tasks */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 8 }}
        className="mt-1"
      >
        {tasks.map((task) => (
          <View
            key={task.id}
            style={{ width: cardWidth }}
            className={`mr-2.5 p-3 rounded-xl border ${colors.cardBorder} ${colors.cardBg} bg-black/30`}
          >
            {/* Task Title & Details */}
            <View className="flex-row items-center justify-between mb-1.5">
              <View className="flex-row items-center space-x-1.5 flex-1 pr-2">
                <View
                  className={`w-2 h-2 rounded-full ${
                    PRIORITY_COLOR[task.priority] || "bg-slate-400"
                  }`}
                />
                <Text
                  className="text-white text-sm font-semibold flex-1"
                  numberOfLines={1}
                >
                  {task.title}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => onDismissTask(task.id)}
                className="p-1"
                accessibilityLabel="Dismiss task"
              >
                <Ionicons name="close-circle-outline" size={16} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* Time / Date / Note Preview */}
            <View className="flex-row items-center space-x-2 mb-2">
              <Text className="text-slate-400 text-[11px]">
                {formatTaskDate(task.date)}
                {task.time ? ` · ${task.time}` : ""}
              </Text>
              {task.note ? (
                <Text
                  className="text-slate-400 text-[11px] flex-1 italic"
                  numberOfLines={1}
                >
                  "{task.note}"
                </Text>
              ) : null}
            </View>

            {/* Action Buttons: Done / Not Done / Jump */}
            <View className="flex-row items-center justify-between pt-1 border-t border-white/[0.08]">
              <View className="flex-row items-center space-x-2">
                <TouchableOpacity
                  onPress={() => onMarkDone(task)}
                  className="flex-row items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 active:bg-emerald-500/30"
                >
                  <Ionicons name="checkmark" size={13} color="#6ee7b7" />
                  <Text className="text-[11px] font-bold text-emerald-300">
                    Done
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => onMarkNotDone(task)}
                  className="flex-row items-center space-x-1 px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-500/40 active:bg-rose-500/30"
                >
                  <Ionicons name="close" size={13} color="#fda4af" />
                  <Text className="text-[11px] font-bold text-rose-300">
                    Not Done
                  </Text>
                </TouchableOpacity>
              </View>

              {onJumpToDate && (
                <TouchableOpacity
                  onPress={() => onJumpToDate(task.date)}
                  className="flex-row items-center space-x-1 px-2 py-1 rounded-lg bg-white/[0.06] active:bg-white/[0.1]"
                >
                  <Ionicons name="calendar-outline" size={12} color="#94a3b8" />
                  <Text className="text-[10px] text-slate-300 font-medium">
                    View Day
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Task } from "@cluanote/shared";

interface ReminderBannerProps {
  tasks: Task[];
  onDismiss: () => void;
  onJumpToDate?: (date: string) => void;
}

export const ReminderBanner: React.FC<ReminderBannerProps> = ({
  tasks,
  onDismiss,
  onJumpToDate,
}) => {
  if (tasks.length === 0) return null;

  return (
    <View className="mx-4 mt-3 p-3.5 rounded-2xl bg-indigo-950/60 border border-indigo-500/40 flex-row items-center justify-between">
      <View className="flex-row items-center space-x-3 flex-1 pr-2">
        <View className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 items-center justify-center">
          <Ionicons name="notifications-outline" size={16} color="#818cf8" />
        </View>
        <View className="flex-1">
          <Text className="text-white text-xs font-bold">
            {tasks.length} unfinished task{tasks.length > 1 ? "s" : ""} from yesterday
          </Text>
          <Text className="text-slate-400 text-[11px] mt-0.5">
            Review or complete them to keep your streak!
          </Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={onDismiss}
        className="p-1.5 rounded-lg bg-white/[0.05]"
      >
        <Ionicons name="close" size={16} color="#94a3b8" />
      </TouchableOpacity>
    </View>
  );
};

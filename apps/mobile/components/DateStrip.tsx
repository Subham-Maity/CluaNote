import React from "react";
import { View, Text, TouchableOpacity, ScrollView, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import {
  format,
  addDays,
  subDays,
  isToday,
  parseISO,
  startOfWeek,
} from "date-fns";
import { Ionicons } from "@expo/vector-icons";

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

  // 7 days of current week
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const handlePrevWeek = () => {
    const prev = subDays(currentDateObj, 7);
    onSelectDate(format(prev, "yyyy-MM-dd"));
  };

  const handleNextWeek = () => {
    const next = addDays(currentDateObj, 7);
    onSelectDate(format(next, "yyyy-MM-dd"));
  };

  const handleJumpToday = () => {
    onSelectDate(format(new Date(), "yyyy-MM-dd"));
  };

  return (
    <View className="px-4 py-2.5 bg-white/[0.02] border-b border-white/[0.08]">
      {/* Month Header and Navigation Controls */}
      <View className="flex-row items-center justify-between mb-2.5">
        <View className="flex-row items-center gap-2">
          <Text className="text-white font-bold text-sm">
            {format(currentDateObj, "MMMM yyyy")}
          </Text>
          {!isToday(currentDateObj) && (
            <TouchableOpacity
              onPress={handleJumpToday}
              className="px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30"
            >
              <Text className="text-[10px] font-semibold text-indigo-300">
                Today
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View className="flex-row items-center gap-1.5">
          <TouchableOpacity
            onPress={handlePrevWeek}
            className="w-7 h-7 rounded-lg bg-white/[0.05] items-center justify-center"
          >
            <Ionicons name="chevron-back" size={16} color="#94a3b8" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleNextWeek}
            className="w-7 h-7 rounded-lg bg-white/[0.05] items-center justify-center"
          >
            <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 7 Days Row */}
      <View className="flex-row justify-between">
        {days.map((d) => {
          const dateStr = format(d, "yyyy-MM-dd");
          const isSelected = dateStr === selectedDate;
          const isCurrentToday = isToday(d);

          return (
            <TouchableOpacity
              key={dateStr}
              onPress={() => {
                if (Platform.OS !== "web") {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                }
                onSelectDate(dateStr);
              }}
              accessible={true}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`Select ${format(d, "EEEE, MMMM d")}`}
              className={`flex-1 items-center py-2 mx-0.5 rounded-xl border ${
                isSelected
                  ? "bg-indigo-600/90 border-indigo-400 shadow-md shadow-indigo-500/30"
                  : isCurrentToday
                  ? "bg-white/[0.06] border-indigo-500/40"
                  : "bg-white/[0.03] border-transparent"
              }`}
            >
              <Text
                className={`text-[10px] font-bold uppercase mb-1 ${
                  isSelected
                    ? "text-white"
                    : isCurrentToday
                    ? "text-indigo-400"
                    : "text-slate-400"
                }`}
              >
                {format(d, "EEE")}
              </Text>
              <Text
                className={`text-sm font-bold ${
                  isSelected ? "text-white" : "text-slate-200"
                }`}
              >
                {format(d, "d")}
              </Text>

              {/* Today indicator dot */}
              {isCurrentToday && (
                <View
                  className={`w-1 h-1 rounded-full mt-1 ${
                    isSelected ? "bg-white" : "bg-indigo-400"
                  }`}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

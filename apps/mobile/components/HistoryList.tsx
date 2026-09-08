import React, { useState } from "react";
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  RefreshControl,
  LayoutAnimation,
  Platform,
  UIManager,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format, parseISO, isToday, isYesterday, isPast } from "date-fns";
import type { Task } from "@cluanote/shared";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface HistoryListProps {
  tasks: Task[];
  segment: "pending" | "not_done" | "completed";
  isLoading: boolean;
  onRefresh: () => void;
  onToggleComplete: (task: Task) => void;
  onSetStatus: (task: Task, status: number) => void;
  onDelete: (task: Task) => void;
  onJumpToDate: (date: string) => void;
}

interface SectionData {
  date: string;
  data: Task[];
}

const PRIORITY_COLOR: Record<string, { dot: string; text: string; bg: string }> = {
  high: { dot: "bg-rose-500", text: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/30" },
  medium: { dot: "bg-amber-400", text: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30" },
  low: { dot: "bg-emerald-400", text: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" },
};

export const HistoryList: React.FC<HistoryListProps> = ({
  tasks,
  segment,
  isLoading,
  onRefresh,
  onToggleComplete,
  onSetStatus,
  onDelete,
  onJumpToDate,
}) => {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const toggleExpand = (id: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const confirmDelete = (task: Task) => {
    Alert.alert(
      "Delete Task",
      `Are you sure you want to delete "${task.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDelete(task),
        },
      ]
    );
  };

  // Group tasks by date descending
  const grouped = tasks.reduce<Record<string, Task[]>>((acc, t) => {
    if (!acc[t.date]) acc[t.date] = [];
    acc[t.date].push(t);
    return acc;
  }, {});

  const sections: SectionData[] = Object.keys(grouped)
    .sort((a, b) => b.localeCompare(a))
    .map((date) => ({
      date,
      data: grouped[date],
    }));

  const formatDateHeader = (dateStr: string) => {
    try {
      const d = parseISO(dateStr);
      if (isToday(d)) return "Today";
      if (isYesterday(d)) return "Yesterday";
      return format(d, "EEE, MMM d, yyyy");
    } catch {
      return dateStr;
    }
  };

  const getDateRelativeTag = (dateStr: string) => {
    try {
      const d = parseISO(dateStr);
      if (isToday(d)) {
        return { label: "Today", bg: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30" };
      }
      if (isYesterday(d)) {
        return { label: "Yesterday", bg: "bg-orange-500/20 text-orange-300 border-orange-500/30" };
      }
      if (isPast(d)) {
        return { label: "Overdue", bg: "bg-rose-500/20 text-rose-300 border-rose-500/30" };
      }
      return { label: "Upcoming", bg: "bg-slate-500/20 text-slate-300 border-slate-500/30" };
    } catch {
      return null;
    }
  };

  return (
    <SectionList
      style={{ flex: 1 }}
      className="flex-1"
      sections={sections}
      keyExtractor={(item, index) => item.uuid || `${item.id || index}-${index}`}
      initialNumToRender={20}
      maxToRenderPerBatch={20}
      windowSize={10}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={onRefresh}
          tintColor="#818cf8"
        />
      }
      contentContainerStyle={{ paddingBottom: 100 }}
      stickySectionHeadersEnabled={false}
      ListEmptyComponent={
        <View className="items-center justify-center py-20 px-6">
          <View className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.08] items-center justify-center mb-3">
            <Ionicons
              name={
                segment === "completed"
                  ? "checkmark-done-circle-outline"
                  : segment === "not_done"
                  ? "alert-circle-outline"
                  : "time-outline"
              }
              size={32}
              color="#64748b"
            />
          </View>
          <Text className="text-white text-base font-semibold text-center">
            {segment === "completed"
              ? "No completed tasks yet"
              : segment === "not_done"
              ? "No missed tasks"
              : "No pending tasks"}
          </Text>
          <Text className="text-slate-500 text-xs text-center mt-1">
            {segment === "completed"
              ? "Tasks you complete will appear here"
              : segment === "not_done"
              ? "Tasks marked as missed or not done will appear here"
              : "All caught up! No overdue or pending tasks"}
          </Text>
        </View>
      }
      renderSectionHeader={({ section: { date, data } }) => {
        const tag = getDateRelativeTag(date);
        return (
          <View className="flex-row items-center justify-between mt-4 mb-2 px-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-white text-xs font-bold uppercase tracking-wider">
                {formatDateHeader(date)}
              </Text>
              {tag && (
                <View className={`px-2 py-0.5 rounded-full border ${tag.bg}`}>
                  <Text className="text-[10px] font-bold">{tag.label}</Text>
                </View>
              )}
            </View>
            <Text className="text-slate-500 text-xs font-medium">
              {data.length} task{data.length > 1 ? "s" : ""}
            </Text>
          </View>
        );
      }}
      renderItem={({ item }) => {
        const isExpanded = expandedId === item.id;
        const priorityMeta =
          PRIORITY_COLOR[item.priority] || PRIORITY_COLOR.low;

        return (
          <View className="mb-2 rounded-xl bg-white/[0.03] border border-white/[0.07] overflow-hidden">
            {/* Collapsed Row Header */}
            <TouchableOpacity
              onPress={() => toggleExpand(item.id)}
              activeOpacity={0.7}
              className="p-3.5 flex-row items-center justify-between"
            >
              <View className="flex-row items-center gap-2.5 flex-1 pr-2">
                <View className={`w-2 h-2 rounded-full ${priorityMeta.dot}`} />
                <View className="flex-1">
                  <Text
                    className={`text-sm font-semibold ${
                      item.completed === 1
                        ? "text-slate-400 line-through"
                        : item.completed === 2
                        ? "text-rose-300/90"
                        : "text-white"
                    }`}
                    numberOfLines={isExpanded ? undefined : 1}
                  >
                    {item.title}
                  </Text>
                  {!isExpanded && (
                    <Text className="text-slate-500 text-[11px] mt-0.5">
                      {item.time ? item.time : "Anytime"}
                      {item.note ? " · Has note" : ""}
                    </Text>
                  )}
                </View>
              </View>

              <View className="flex-row items-center gap-2">
                <View
                  className={`px-2 py-0.5 rounded border text-[10px] ${priorityMeta.bg}`}
                >
                  <Text
                    className={`text-[10px] font-bold uppercase ${priorityMeta.text}`}
                  >
                    {item.priority}
                  </Text>
                </View>
                <Ionicons
                  name={isExpanded ? "chevron-up" : "chevron-down"}
                  size={16}
                  color="#64748b"
                />
              </View>
            </TouchableOpacity>

            {/* Expanded Content Drawer */}
            {isExpanded && (
              <View className="px-3.5 pb-3.5 pt-1 border-t border-white/[0.05] bg-black/20">
                {/* Note */}
                {item.note ? (
                  <View className="p-2.5 rounded-lg bg-white/[0.04] border border-white/[0.05] mb-3">
                    <Text className="text-slate-300 text-xs leading-relaxed">
                      {item.note}
                    </Text>
                  </View>
                ) : null}

                {/* Details Meta Row */}
                <View className="flex-row items-center justify-between mb-3 text-slate-400 text-xs">
                  <View className="flex-row items-center gap-1.5">
                    <Ionicons name="calendar-outline" size={13} color="#94a3b8" />
                    <Text className="text-slate-400 text-xs">{item.date}</Text>
                    {item.time && (
                      <Text className="text-slate-400 text-xs">· {item.time}</Text>
                    )}
                  </View>

                  <View className="flex-row items-center gap-1.5">
                    <Text className="text-slate-500 text-xs">Status:</Text>
                    <Text
                      className={`text-xs font-semibold ${
                        item.completed === 1
                          ? "text-emerald-400"
                          : item.completed === 2
                          ? "text-rose-400"
                          : "text-amber-400"
                      }`}
                    >
                      {item.completed === 1
                        ? "Completed"
                        : item.completed === 2
                        ? "Not Done"
                        : "Pending"}
                    </Text>
                  </View>
                </View>

                {/* Action Buttons Row */}
                <View className="flex-row items-center justify-between pt-2 border-t border-white/[0.05]">
                  <View className="flex-row items-center gap-2 flex-wrap">
                    {/* Mark Done */}
                    {item.completed !== 1 && (
                      <TouchableOpacity
                        onPress={() => onSetStatus(item, 1)}
                        className="flex-row items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 active:bg-emerald-500/40"
                      >
                        <Ionicons name="checkmark" size={13} color="#6ee7b7" />
                        <Text className="text-[11px] font-bold text-emerald-300">
                          Mark Done
                        </Text>
                      </TouchableOpacity>
                    )}

                    {/* Mark Not Done */}
                    {item.completed !== 2 && (
                      <TouchableOpacity
                        onPress={() => onSetStatus(item, 2)}
                        className="flex-row items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/30 active:bg-rose-500/40"
                      >
                        <Ionicons name="close" size={13} color="#fda4af" />
                        <Text className="text-[11px] font-bold text-rose-300">
                          Not Done
                        </Text>
                      </TouchableOpacity>
                    )}

                    {/* Reopen if Done or Not Done */}
                    {item.completed !== 0 && (
                      <TouchableOpacity
                        onPress={() => onSetStatus(item, 0)}
                        className="flex-row items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/30 active:bg-indigo-500/40"
                      >
                        <Ionicons name="refresh" size={13} color="#a5b4fc" />
                        <Text className="text-[11px] font-bold text-indigo-300">
                          Reopen
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View className="flex-row items-center gap-1.5">
                    {/* Jump to Date */}
                    <TouchableOpacity
                      onPress={() => onJumpToDate(item.date)}
                      className="p-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] active:bg-white/[0.1]"
                      accessibilityLabel="Jump to date in Today tab"
                    >
                      <Ionicons name="arrow-redo-outline" size={15} color="#818cf8" />
                    </TouchableOpacity>

                    {/* Delete Task */}
                    <TouchableOpacity
                      onPress={() => confirmDelete(item)}
                      className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 active:bg-rose-500/30"
                      accessibilityLabel="Delete task"
                    >
                      <Ionicons name="trash-outline" size={15} color="#f43f5e" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>
        );
      }}
    />
  );
};

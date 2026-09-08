import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Dimensions,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from "react-native-draggable-flatlist";
import { Ionicons } from "@expo/vector-icons";
import { KanbanCard, KanbanStatus } from "./KanbanCard";
import type { Task } from "@cluanote/shared";

interface KanbanBoardProps {
  tasks: Task[];
  isLoading: boolean;
  onRefresh: () => void;
  onCardPress: (task: Task) => void;
  onPushToEvent: (task: Task) => void;
  onMoveStatus: (task: Task, target: KanbanStatus) => void;
  onDelete: (task: Task) => void;
}

interface ColumnConfig {
  id: KanbanStatus;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  headerBg: string;
}

const COLUMNS: ColumnConfig[] = [
  {
    id: "todo",
    title: "To-Do",
    icon: "list-outline",
    badgeBg: "bg-slate-500/20",
    badgeText: "text-slate-300",
    borderColor: "border-slate-500/20",
    headerBg: "bg-slate-900/90",
  },
  {
    id: "doing",
    title: "In Progress",
    icon: "flash-outline",
    badgeBg: "bg-amber-500/20",
    badgeText: "text-amber-300",
    borderColor: "border-amber-500/30",
    headerBg: "bg-amber-950/40",
  },
  {
    id: "done",
    title: "Done",
    icon: "checkmark-circle-outline",
    badgeBg: "bg-emerald-500/20",
    badgeText: "text-emerald-300",
    borderColor: "border-emerald-500/30",
    headerBg: "bg-emerald-950/40",
  },
];

export function getKanbanStatus(completed: number): KanbanStatus {
  if (completed === 1) return "done";
  if (completed === 3) return "doing";
  return "todo";
}

export function kanbanStatusToCompleted(status: KanbanStatus): number {
  if (status === "done") return 1;
  if (status === "doing") return 3;
  return 0;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  isLoading,
  onRefresh,
  onCardPress,
  onPushToEvent,
  onMoveStatus,
  onDelete,
}) => {
  const screenWidth = Dimensions.get("window").width;
  // Make column width peek the next column smoothly
  const columnWidth = Math.round(screenWidth * 0.82);

  // Group tasks by kanban status
  const groupedTasks: Record<KanbanStatus, Task[]> = {
    todo: tasks.filter((t) => getKanbanStatus(t.completed) === "todo"),
    doing: tasks.filter((t) => getKanbanStatus(t.completed) === "doing"),
    done: tasks.filter((t) => getKanbanStatus(t.completed) === "done"),
  };

  const renderCardItem = (
    params: RenderItemParams<Task>,
    columnId: KanbanStatus
  ) => {
    const { item, drag, isActive } = params;
    return (
      <ScaleDecorator>
        <KanbanCard
          task={item}
          currentStatus={columnId}
          onPress={onCardPress}
          onPushToEvent={onPushToEvent}
          onMoveStatus={onMoveStatus}
          onDelete={onDelete}
          drag={drag}
          isActive={isActive}
        />
      </ScaleDecorator>
    );
  };

  return (
    <ScrollView
      horizontal
      pagingEnabled={false}
      snapToInterval={columnWidth + 16}
      decelerationRate="fast"
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
      className="flex-1"
    >
      {COLUMNS.map((column) => {
        const columnTasks = groupedTasks[column.id];

        return (
          <View
            key={column.id}
            style={{ width: columnWidth }}
            className={`mr-4 rounded-3xl border ${column.borderColor} bg-white/[0.02] flex-col overflow-hidden`}
          >
            {/* Column Header */}
            <View
              className={`px-4 py-3 border-b border-white/[0.08] ${column.headerBg} flex-row items-center justify-between`}
            >
              <View className="flex-row items-center gap-2">
                <Ionicons
                  name={column.icon}
                  size={16}
                  color={
                    column.id === "doing"
                      ? "#f59e0b"
                      : column.id === "done"
                      ? "#10b981"
                      : "#94a3b8"
                  }
                />
                <Text className="text-white font-bold text-sm">
                  {column.title}
                </Text>
              </View>

              <View
                className={`px-2.5 py-0.5 rounded-full ${column.badgeBg} border border-white/[0.05]`}
              >
                <Text className={`text-xs font-bold ${column.badgeText}`}>
                  {columnTasks.length}
                </Text>
              </View>
            </View>

            {/* Column Cards (DraggableFlatList) */}
            <View className="flex-1 p-3">
              <DraggableFlatList
                data={columnTasks}
                keyExtractor={(item) => item.uuid || String(item.id)}
                onDragEnd={({ data }) => {
                  // Internal column reordering
                }}
                renderItem={(params) => renderCardItem(params, column.id)}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 90 }}
                refreshControl={
                  <RefreshControl
                    refreshing={isLoading}
                    onRefresh={onRefresh}
                    tintColor="#818cf8"
                  />
                }
                ListEmptyComponent={
                  <View className="py-12 px-4 items-center justify-center">
                    <View className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] items-center justify-center mb-2">
                      <Ionicons
                        name="folder-open-outline"
                        size={22}
                        color="#64748b"
                      />
                    </View>
                    <Text className="text-slate-400 text-xs font-semibold text-center">
                      No cards in {column.title}
                    </Text>
                    <Text className="text-slate-600 text-[11px] text-center mt-0.5">
                      {column.id === "todo"
                        ? "Tap + button to create a future planning note"
                        : "Move notes here as work progresses"}
                    </Text>
                  </View>
                }
              />
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
};

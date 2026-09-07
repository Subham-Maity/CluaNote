import { useState, useEffect, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { getFutureNotes, pushNoteToEvent } from "../../lib/tasks";
import type { Task } from "@cluanote/shared";

export default function KanbanScreen() {
  const [notes, setNotes] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadNotes = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getFutureNotes();
      setNotes(data);
    } catch (err) {
      console.error("Failed to load future notes:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handlePromote = async (id: number) => {
    try {
      await pushNoteToEvent(id);
      await loadNotes();
    } catch (err) {
      console.error("Failed to promote note:", err);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#090d16] px-4 pt-2">
      <View className="flex-row items-center justify-between mb-4">
        <View>
          <Text className="text-2xl font-bold text-white tracking-tight">
            Kanban Notes
          </Text>
          <Text className="text-xs text-slate-400 mt-0.5">
            Future planning ideas & thoughts
          </Text>
        </View>
      </View>

      <FlatList
        data={notes}
        keyExtractor={(item) => item.uuid || String(item.id)}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={loadNotes}
            tintColor="#818cf8"
          />
        }
        contentContainerStyle={{ paddingBottom: 80 }}
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <Ionicons name="bulb-outline" size={32} color="#64748b" />
            <Text className="text-slate-400 text-xs mt-2 text-center">
              No future notes yet. Save thoughts here to plan ahead!
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View className="mb-2.5 p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
            <Text className="text-white text-sm font-semibold">{item.title}</Text>
            {item.note ? (
              <Text className="text-slate-300 text-xs mt-1">{item.note}</Text>
            ) : null}

            <View className="flex-row items-center justify-between mt-3 pt-2.5 border-t border-white/[0.06]">
              <Text className="text-slate-500 text-[10px]">
                Target: {item.date}
              </Text>
              <TouchableOpacity
                onPress={() => handlePromote(item.id)}
                className="px-2 py-1 rounded-md bg-indigo-500/20 border border-indigo-500/30 flex-row items-center space-x-1"
              >
                <Ionicons name="arrow-forward" size={12} color="#818cf8" />
                <Text className="text-indigo-300 text-[10px] font-bold">
                  Push to Day
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

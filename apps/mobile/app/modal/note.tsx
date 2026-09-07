import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function NoteModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ initialNote?: string; title?: string }>();
  const [noteText, setNoteText] = useState(params.initialNote ?? "");
  const [mode, setMode] = useState<"edit" | "preview">("edit");

  return (
    <SafeAreaView className="flex-1 bg-[#090d16]">
      {/* Top Header */}
      <View className="px-4 py-3 border-b border-white/[0.08] flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-1 rounded-lg bg-white/[0.05]"
        >
          <Ionicons name="close" size={20} color="#94a3b8" />
        </TouchableOpacity>

        <Text className="text-white font-bold text-sm" numberOfLines={1}>
          {params.title ? `Note: ${params.title}` : "Markdown Note"}
        </Text>

        {/* Mode Switcher */}
        <View className="flex-row rounded-lg bg-white/[0.05] p-0.5 border border-white/[0.08]">
          <TouchableOpacity
            onPress={() => setMode("edit")}
            className={`px-2.5 py-1 rounded-md ${
              mode === "edit" ? "bg-indigo-600" : ""
            }`}
          >
            <Text className="text-white text-[11px] font-semibold">Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMode("preview")}
            className={`px-2.5 py-1 rounded-md ${
              mode === "preview" ? "bg-indigo-600" : ""
            }`}
          >
            <Text className="text-white text-[11px] font-semibold">Preview</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Editor / Preview Area */}
      <View className="flex-1 p-4">
        {mode === "edit" ? (
          <TextInput
            value={noteText}
            onChangeText={setNoteText}
            multiline
            textAlignVertical="top"
            placeholder="Type your markdown notes here..."
            placeholderTextColor="#64748b"
            className="flex-1 text-white text-sm font-mono leading-relaxed"
            autoFocus
          />
        ) : (
          <View className="flex-1 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <Text className="text-slate-200 text-sm leading-relaxed">
              {noteText || "(Empty note)"}
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Markdown from "react-native-markdown-display";

export default function NoteModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ initialNote?: string; title?: string }>();
  const [noteText, setNoteText] = useState(params.initialNote ?? "");
  const [mode, setMode] = useState<"edit" | "preview">("preview");

  const markdownStyles = {
    body: {
      color: "#e2e8f0",
      fontSize: 14,
      lineHeight: 22,
    },
    heading1: {
      color: "#ffffff",
      fontSize: 20,
      fontWeight: "700" as const,
      marginBottom: 10,
    },
    heading2: {
      color: "#818cf8",
      fontSize: 16,
      fontWeight: "600" as const,
      marginBottom: 8,
    },
    code_inline: {
      backgroundColor: "rgba(255, 255, 255, 0.08)",
      color: "#a5b4fc",
      borderRadius: 4,
      paddingHorizontal: 4,
    },
    code_block: {
      backgroundColor: "rgba(0, 0, 0, 0.4)",
      borderColor: "rgba(255, 255, 255, 0.1)",
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      color: "#f8fafc",
    },
    bullet_list: {
      marginVertical: 4,
    },
    hr: {
      backgroundColor: "rgba(255, 255, 255, 0.1)",
      marginVertical: 12,
    },
  };

  return (
    <SafeAreaView className="flex-1 bg-[#090d16]">
      {/* Top Header */}
      <View className="px-4 py-3 border-b border-white/[0.08] flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-1.5 rounded-lg bg-white/[0.05]"
        >
          <Ionicons name="close" size={20} color="#94a3b8" />
        </TouchableOpacity>

        <Text className="text-white font-bold text-sm max-w-[180px]" numberOfLines={1}>
          {params.title || "Markdown Note"}
        </Text>

        {/* Mode Switcher */}
        <View className="flex-row rounded-lg bg-white/[0.05] p-0.5 border border-white/[0.08]">
          <TouchableOpacity
            onPress={() => setMode("edit")}
            className={`px-3 py-1 rounded-md ${
              mode === "edit" ? "bg-indigo-600 shadow-sm" : ""
            }`}
          >
            <Text className="text-white text-xs font-semibold">Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMode("preview")}
            className={`px-3 py-1 rounded-md ${
              mode === "preview" ? "bg-indigo-600 shadow-sm" : ""
            }`}
          >
            <Text className="text-white text-xs font-semibold">Preview</Text>
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
            placeholder="Write markdown here (# header, - list item, `code`)..."
            placeholderTextColor="#64748b"
            className="flex-1 text-white text-sm font-mono leading-relaxed"
            autoFocus
          />
        ) : (
          <ScrollView
            className="flex-1 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]"
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            {noteText.trim() ? (
              <Markdown style={markdownStyles}>{noteText}</Markdown>
            ) : (
              <Text className="text-slate-500 text-xs italic">
                (This task has no markdown notes. Tap "Edit" above to add details.)
              </Text>
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { CURRENT_VERSION, GITHUB_REPO } from "@cluanote/shared";

export default function SettingsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-[#090d16] px-4 pt-2">
      <Text className="text-2xl font-bold text-white tracking-tight mb-4">
        Settings
      </Text>

      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        {/* App Info Card */}
        <View className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] mb-4">
          <View className="flex-row items-center space-x-3 mb-2">
            <View className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/40 items-center justify-center">
              <Ionicons name="flash-outline" size={22} color="#818cf8" />
            </View>
            <View>
              <Text className="text-white font-bold text-base">CluaNote Mobile</Text>
              <Text className="text-slate-400 text-xs">v{CURRENT_VERSION} • Cross-Platform</Text>
            </View>
          </View>
          <Text className="text-slate-300 text-xs leading-relaxed">
            Minimalist, dark glassmorphic task & schedule manager. Fast on-device SQLite database with cross-platform sync capabilities.
          </Text>
        </View>

        {/* Preferences Section */}
        <View className="rounded-2xl bg-white/[0.04] border border-white/[0.08] overflow-hidden mb-4">
          <View className="p-3.5 border-b border-white/[0.06] flex-row items-center justify-between">
            <View className="flex-row items-center space-x-3">
              <Ionicons name="notifications-outline" size={18} color="#818cf8" />
              <Text className="text-white text-sm">Task Reminders</Text>
            </View>
            <Text className="text-indigo-400 text-xs font-semibold">Enabled</Text>
          </View>

          <View className="p-3.5 border-b border-white/[0.06] flex-row items-center justify-between">
            <View className="flex-row items-center space-x-3">
              <Ionicons name="cloud-upload-outline" size={18} color="#818cf8" />
              <Text className="text-white text-sm">PostgreSQL Sync</Text>
            </View>
            <Text className="text-slate-500 text-xs">Configured in v1.7</Text>
          </View>

          <View className="p-3.5 flex-row items-center justify-between">
            <View className="flex-row items-center space-x-3">
              <Ionicons name="logo-github" size={18} color="#818cf8" />
              <Text className="text-white text-sm">GitHub Repository</Text>
            </View>
            <Text className="text-slate-400 text-xs font-mono">{GITHUB_REPO}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

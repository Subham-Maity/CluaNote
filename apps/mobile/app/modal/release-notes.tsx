import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Markdown from "react-native-markdown-display";
import { format, parseISO } from "date-fns";
import { fetchMobileReleases } from "../../lib/updater";
import type { GitHubRelease } from "@cluanote/shared";

export default function ReleaseNotesModal() {
  const router = useRouter();
  const [releases, setReleases] = useState<GitHubRelease[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadReleases = async (force = false) => {
    try {
      const data = await fetchMobileReleases(force);
      setReleases(data);
    } catch (err) {
      console.warn("Failed to load release notes:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadReleases();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadReleases(true);
  };

  const formatDate = (isoStr: string) => {
    try {
      return format(parseISO(isoStr), "MMMM d, yyyy");
    } catch {
      return isoStr;
    }
  };

  const markdownStyles = {
    body: {
      color: "#cbd5e1",
      fontSize: 13,
      lineHeight: 20,
    },
    heading1: {
      color: "#ffffff",
      fontSize: 18,
      fontWeight: "700" as const,
      marginTop: 12,
      marginBottom: 6,
    },
    heading2: {
      color: "#f1f5f9",
      fontSize: 15,
      fontWeight: "600" as const,
      marginTop: 10,
      marginBottom: 4,
    },
    heading3: {
      color: "#e2e8f0",
      fontSize: 14,
      fontWeight: "600" as const,
      marginTop: 8,
      marginBottom: 4,
    },
    bullet_list: {
      marginTop: 4,
      marginBottom: 4,
    },
    list_item: {
      flexDirection: "row" as const,
      alignItems: "flex-start" as const,
      marginBottom: 4,
    },
    bullet_list_icon: {
      color: "#818cf8",
      fontSize: 16,
      marginRight: 8,
    },
    code_inline: {
      backgroundColor: "rgba(255,255,255,0.08)",
      color: "#93c5fd",
      borderRadius: 4,
      paddingHorizontal: 5,
      paddingVertical: 1,
      fontSize: 12,
      fontFamily: "monospace",
    },
    code_block: {
      backgroundColor: "rgba(0,0,0,0.4)",
      borderColor: "rgba(255,255,255,0.1)",
      borderWidth: 1,
      borderRadius: 8,
      padding: 10,
      color: "#e2e8f0",
      fontSize: 12,
      marginVertical: 6,
      fontFamily: "monospace",
    },
    link: {
      color: "#818cf8",
      textDecorationLine: "underline" as const,
    },
  };

  const renderReleaseItem = ({ item }: { item: GitHubRelease }) => {
    return (
      <View className="mb-5 rounded-2xl bg-white/[0.04] border border-white/[0.08] p-4">
        {/* Release Header */}
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center space-x-2">
            <View className="px-2.5 py-1 rounded-full bg-indigo-600/30 border border-indigo-500/40">
              <Text className="text-indigo-300 font-bold text-xs">
                {item.tag_name}
              </Text>
            </View>
            <Text className="text-white font-semibold text-sm">
              {item.name || item.tag_name}
            </Text>
          </View>
          <Text className="text-slate-400 text-xs">
            {formatDate(item.published_at)}
          </Text>
        </View>

        {/* Markdown Body */}
        <View className="mt-2 pt-2 border-t border-white/[0.06]">
          {item.body ? (
            <Markdown style={markdownStyles}>{item.body}</Markdown>
          ) : (
            <Text className="text-slate-400 text-xs italic">
              No release description provided.
            </Text>
          )}
        </View>

        {/* View on GitHub */}
        <TouchableOpacity
          onPress={() => Linking.openURL(item.html_url)}
          accessibilityRole="button"
          accessibilityLabel={`View ${item.tag_name} on GitHub`}
          activeOpacity={0.7}
          className="mt-3 pt-2 border-t border-white/[0.06] flex-row items-center space-x-1.5 justify-end"
        >
          <Text className="text-indigo-400 text-xs font-semibold">
            View on GitHub
          </Text>
          <Ionicons name="open-outline" size={13} color="#818cf8" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView
      accessible={true}
      accessibilityViewIsModal={true}
      className="flex-1 bg-[#090d16]"
    >
      {/* Modal Header */}
      <View className="px-4 py-3 border-b border-white/[0.08] flex-row items-center justify-between">
        <View className="flex-row items-center space-x-2.5">
          <TouchableOpacity
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            activeOpacity={0.7}
            className="w-8 h-8 rounded-full bg-white/10 items-center justify-center"
          >
            <Ionicons name="chevron-back" size={20} color="#cbd5e1" />
          </TouchableOpacity>
          <View>
            <Text className="text-white font-bold text-base">Release Notes</Text>
            <Text className="text-slate-400 text-xs">Changelog & Updates</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleRefresh}
          disabled={isLoading || isRefreshing}
          accessibilityRole="button"
          accessibilityLabel="Refresh releases"
          activeOpacity={0.7}
          className="w-8 h-8 rounded-full bg-white/10 items-center justify-center"
        >
          <Ionicons
            name="refresh"
            size={16}
            color={isRefreshing ? "#818cf8" : "#94a3b8"}
          />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#818cf8" />
          <Text className="text-slate-400 text-xs mt-3">Loading releases...</Text>
        </View>
      ) : releases.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="cloud-offline-outline" size={48} color="#475569" />
          <Text className="text-slate-300 font-semibold text-sm mt-3 text-center">
            No release history available
          </Text>
          <Text className="text-slate-400 text-xs mt-1 text-center">
            Check your internet connection or try refreshing.
          </Text>
          <TouchableOpacity
            onPress={handleRefresh}
            activeOpacity={0.8}
            className="mt-4 px-4 py-2 rounded-xl bg-indigo-600"
          >
            <Text className="text-white text-xs font-semibold">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={releases}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderReleaseItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

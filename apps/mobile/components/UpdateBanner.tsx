import React, { useEffect, useState, useRef } from "react";
import { View, Text, TouchableOpacity, Animated, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  checkMobileUpdate,
  dismissMobileUpdate,
  isUpdateDismissed,
} from "../lib/updater";
import type { UpdateCheckResult } from "@cluanote/shared";

export const UpdateBanner: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);
  const slideAnim = useRef(new Animated.Value(-120)).current;

  useEffect(() => {
    let isMounted = true;

    async function checkForNewVersion() {
      try {
        const result = await checkMobileUpdate();
        if (result.hasUpdate && isMounted) {
          const dismissed = await isUpdateDismissed(result.latestVersion);
          if (!dismissed) {
            setUpdateInfo(result);
            Animated.spring(slideAnim, {
              toValue: 0,
              useNativeDriver: true,
              damping: 16,
              stiffness: 120,
            }).start();
          }
        }
      } catch (err) {
        console.warn("Error checking for updates in banner:", err);
      }
    }

    checkForNewVersion();

    return () => {
      isMounted = false;
    };
  }, [slideAnim]);

  const handleDismiss = async () => {
    if (updateInfo) {
      await dismissMobileUpdate(updateInfo.latestVersion);
    }
    Animated.timing(slideAnim, {
      toValue: -120,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setUpdateInfo(null);
    });
  };

  const handleOpenRelease = async () => {
    if (updateInfo?.releaseUrl) {
      try {
        await Linking.openURL(updateInfo.releaseUrl);
      } catch (err) {
        console.warn("Failed to open release URL:", err);
      }
    }
  };

  if (!updateInfo) return null;

  return (
    <Animated.View
      style={{
        transform: [{ translateY: slideAnim }],
        top: Math.max(insets.top + 8, 16),
      }}
      className="absolute left-4 right-4 z-40"
    >
      <View
        accessible={true}
        accessibilityRole="alert"
        accessibilityLabel={`Update available: ${updateInfo.latestVersion}`}
        className="rounded-2xl bg-[#0e1626]/95 border border-indigo-500/40 p-3.5 shadow-2xl shadow-indigo-950/80 flex-row items-center justify-between backdrop-blur-md"
      >
        <View className="flex-row items-center gap-3 flex-1 pr-2">
          <View className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/50 items-center justify-center">
            <Ionicons name="sparkles" size={16} color="#818cf8" />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-1.5">
              <Text className="text-white text-xs font-bold tracking-tight">
                Update Available
              </Text>
              <View className="px-1.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/40">
                <Text className="text-[10px] font-mono text-indigo-300 font-semibold">
                  {updateInfo.latestVersion}
                </Text>
              </View>
            </View>
            <Text
              numberOfLines={1}
              className="text-slate-300 text-[11px] leading-tight mt-0.5"
            >
              A new version of CluaNote is available.
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            onPress={handleOpenRelease}
            accessibilityRole="button"
            accessibilityLabel="View Release"
            accessibilityHint="Opens GitHub release details in browser"
            activeOpacity={0.8}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 border border-indigo-400/30"
          >
            <Text className="text-white text-xs font-semibold">View</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDismiss}
            accessibilityRole="button"
            accessibilityLabel="Dismiss update notification"
            activeOpacity={0.7}
            className="w-7 h-7 rounded-full bg-white/10 items-center justify-center"
          >
            <Ionicons name="close" size={16} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

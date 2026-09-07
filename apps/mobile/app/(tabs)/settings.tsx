import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Audio } from "expo-av";
import { CURRENT_VERSION, GITHUB_REPO } from "@cluanote/shared";
import {
  isAlarmEnabled,
  setAlarmEnabled,
  getCustomSoundUri,
  setCustomSoundUri,
  rescheduleAllAlarms,
  cancelAllTaskAlarms,
  requestNotificationPermission,
} from "../../lib/alarm";
import { getAllTasks } from "../../lib/tasks";

export default function SettingsScreen() {
  const [alarmActive, setAlarmActive] = useState(true);
  const [customSoundUri, setSoundUriState] = useState<string | null>(null);
  const [soundFileName, setSoundFileName] = useState<string>("Default Chime");
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewSound, setPreviewSound] = useState<Audio.Sound | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);

  // Load initial alarm settings
  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      try {
        const enabled = await isAlarmEnabled();
        const soundUri = await getCustomSoundUri();

        if (isMounted) {
          setAlarmActive(enabled);
          setSoundUriState(soundUri);
          if (soundUri) {
            const parts = soundUri.split("/");
            const rawName = parts[parts.length - 1] || "Custom Audio";
            // Strip timestamp prefix if present
            const cleanName = rawName.replace(/^custom_alarm_\d+_/, "");
            setSoundFileName(decodeURIComponent(cleanName));
          } else {
            setSoundFileName("Default Chime");
          }
        }
      } catch (err) {
        console.warn("Failed to load alarm settings:", err);
      }
    }

    loadSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  // Stop preview sound on unmount
  useEffect(() => {
    return () => {
      if (previewSound) {
        previewSound.stopAsync().catch(() => {});
        previewSound.unloadAsync().catch(() => {});
      }
    };
  }, [previewSound]);

  // Toggle master alarm switch
  const handleToggleAlarm = async (value: boolean) => {
    setAlarmActive(value);
    await setAlarmEnabled(value);

    try {
      if (value) {
        const allTasks = await getAllTasks();
        await rescheduleAllAlarms(allTasks);
      } else {
        await cancelAllTaskAlarms();
      }
    } catch (err) {
      console.warn("Failed to sync alarms on toggle:", err);
    }
  };

  // Pick a custom audio file using DocumentPicker
  const handlePickCustomSound = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "audio/*",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const destDirectory = FileSystem.documentDirectory || FileSystem.cacheDirectory;
        const safeName = asset.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const persistentUri = `${destDirectory}custom_alarm_${Date.now()}_${safeName}`;

        await FileSystem.copyAsync({
          from: asset.uri,
          to: persistentUri,
        });

        await setCustomSoundUri(persistentUri);
        setSoundUriState(persistentUri);
        setSoundFileName(asset.name);

        Alert.alert(
          "Custom Sound Set",
          `"${asset.name}" will play when your task alarms trigger.`,
          [{ text: "OK" }]
        );
      }
    } catch (err) {
      console.error("Failed to pick custom audio sound:", err);
      Alert.alert("Error", "Could not load audio file. Please try another format.");
    }
  };

  // Play / Stop preview audio
  const handleToggleSoundPreview = async () => {
    try {
      if (isPlayingPreview) {
        if (previewSound) {
          await previewSound.stopAsync();
          await previewSound.unloadAsync();
          setPreviewSound(null);
        }
        setIsPlayingPreview(false);
        return;
      }

      if (!customSoundUri) {
        Alert.alert("Default Sound", "The default system sound will be used for alarms.");
        return;
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: customSoundUri },
        { volume: 1.0 }
      );
      setPreviewSound(sound);
      setIsPlayingPreview(true);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlayingPreview(false);
          sound.unloadAsync().catch(() => {});
          setPreviewSound(null);
        }
      });

      await sound.playAsync();
    } catch (err) {
      console.warn("Failed to preview sound:", err);
      setIsPlayingPreview(false);
    }
  };

  // Clear custom sound and revert to default chime
  const handleResetSound = async () => {
    if (previewSound) {
      await previewSound.stopAsync().catch(() => {});
      await previewSound.unloadAsync().catch(() => {});
      setPreviewSound(null);
      setIsPlayingPreview(false);
    }
    await setCustomSoundUri(null);
    setSoundUriState(null);
    setSoundFileName("Default Chime");
  };

  // Manually re-sync all alarms
  const handleRescheduleAll = async () => {
    setIsRescheduling(true);
    try {
      const allTasks = await getAllTasks();
      await rescheduleAllAlarms(allTasks);
      Alert.alert("Alarms Synchronized", "All upcoming task alarms have been rescheduled.");
    } catch (err) {
      console.error("Failed to re-sync alarms:", err);
      Alert.alert("Error", "Could not reschedule alarms.");
    } finally {
      setIsRescheduling(false);
    }
  };

  // Request / verify permissions
  const handleCheckPermission = async () => {
    const granted = await requestNotificationPermission();
    setHasPermission(granted);
    if (granted) {
      Alert.alert("Permission Active", "Notifications & exact alarms are permitted.");
    } else {
      Alert.alert(
        "Permission Denied",
        "Please allow notifications for CluaNote in your device settings to receive timely alarms."
      );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#090d16] px-4 pt-2">
      <Text className="text-2xl font-bold text-white tracking-tight mb-4">
        Settings
      </Text>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
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
            Minimalist, dark glassmorphic task & schedule manager. Fast on-device SQLite database with exact scheduled notifications and background alarms.
          </Text>
        </View>

        {/* Alarms & Notifications Section */}
        <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 ml-1">
          Alarms & Notifications
        </Text>
        <View className="rounded-2xl bg-white/[0.04] border border-white/[0.08] overflow-hidden mb-4">
          {/* Master Alarm Toggle */}
          <View className="p-4 border-b border-white/[0.06] flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <View className="flex-row items-center space-x-2">
                <Ionicons name="alarm-outline" size={18} color="#818cf8" />
                <Text className="text-white text-sm font-semibold">Task Alarms</Text>
              </View>
              <Text className="text-slate-400 text-xs mt-0.5">
                Trigger scheduled local notifications and sound alerts when tasks are due
              </Text>
            </View>
            <Switch
              value={alarmActive}
              onValueChange={handleToggleAlarm}
              trackColor={{ false: "#1e293b", true: "#4f46e5" }}
              thumbColor={alarmActive ? "#818cf8" : "#64748b"}
            />
          </View>

          {/* Custom Sound Selection */}
          <View className="p-4 border-b border-white/[0.06]">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center space-x-2">
                <Ionicons name="musical-notes-outline" size={18} color="#818cf8" />
                <Text className="text-white text-sm font-semibold">Alarm Sound</Text>
              </View>
              <Text
                numberOfLines={1}
                className="text-indigo-400 text-xs font-medium max-w-[140px]"
              >
                {soundFileName}
              </Text>
            </View>

            <Text className="text-slate-400 text-xs mb-3">
              Choose an audio file (.mp3, .wav) to play when task alarms trigger.
            </Text>

            <View className="flex-row items-center space-x-2">
              <TouchableOpacity
                onPress={handlePickCustomSound}
                activeOpacity={0.7}
                className="flex-1 py-2 px-3 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex-row items-center justify-center space-x-2"
              >
                <Ionicons name="folder-open-outline" size={16} color="#818cf8" />
                <Text className="text-indigo-200 text-xs font-semibold">Choose Audio</Text>
              </TouchableOpacity>

              {customSoundUri ? (
                <>
                  <TouchableOpacity
                    onPress={handleToggleSoundPreview}
                    activeOpacity={0.7}
                    className="py-2 px-3 rounded-xl bg-white/10 border border-white/10 flex-row items-center justify-center space-x-1.5"
                  >
                    <Ionicons
                      name={isPlayingPreview ? "stop-circle-outline" : "play-circle-outline"}
                      size={16}
                      color="#e2e8f0"
                    />
                    <Text className="text-slate-200 text-xs font-medium">
                      {isPlayingPreview ? "Stop" : "Test"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleResetSound}
                    activeOpacity={0.7}
                    className="py-2 px-3 rounded-xl bg-rose-500/20 border border-rose-500/30 items-center justify-center"
                  >
                    <Ionicons name="trash-outline" size={16} color="#f87171" />
                  </TouchableOpacity>
                </>
              ) : null}
            </View>
          </View>

          {/* Sync / Reschedule Action */}
          <TouchableOpacity
            onPress={handleRescheduleAll}
            disabled={isRescheduling || !alarmActive}
            activeOpacity={0.7}
            className="p-3.5 border-b border-white/[0.06] flex-row items-center justify-between"
          >
            <View className="flex-row items-center space-x-3">
              <Ionicons name="refresh-outline" size={18} color="#818cf8" />
              <Text className="text-white text-sm">Reschedule All Alarms</Text>
            </View>
            <Text className="text-slate-400 text-xs">
              {isRescheduling ? "Syncing..." : "Sync Active"}
            </Text>
          </TouchableOpacity>

          {/* Notification Permissions Row */}
          <TouchableOpacity
            onPress={handleCheckPermission}
            activeOpacity={0.7}
            className="p-3.5 flex-row items-center justify-between"
          >
            <View className="flex-row items-center space-x-3">
              <Ionicons name="shield-checkmark-outline" size={18} color="#818cf8" />
              <Text className="text-white text-sm">Notification Permissions</Text>
            </View>
            <View className="flex-row items-center space-x-1">
              <Text className="text-indigo-400 text-xs font-semibold">
                {hasPermission === false ? "Denied" : "Verify"}
              </Text>
              <Ionicons name="chevron-forward" size={14} color="#64748b" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Sync & Integration Section */}
        <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 ml-1">
          Sync & Cloud
        </Text>
        <View className="rounded-2xl bg-white/[0.04] border border-white/[0.08] overflow-hidden mb-4">
          <View className="p-3.5 border-b border-white/[0.06] flex-row items-center justify-between">
            <View className="flex-row items-center space-x-3">
              <Ionicons name="cloud-upload-outline" size={18} color="#818cf8" />
              <Text className="text-white text-sm">PostgreSQL Sync</Text>
            </View>
            <Text className="text-slate-500 text-xs">Phase 7 Integration</Text>
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

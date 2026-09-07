import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  TextInput,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Application from "expo-application";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { checkMobileUpdate } from "../../lib/updater";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import { format, parseISO } from "date-fns";
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
import {
  exportBackup,
  pickBackupFile,
  inspectBackupJson,
  restoreTasksFromJson,
  getLastBackupDate,
} from "../../lib/backup";
import {
  getSyncConfig,
  saveSyncConfig,
  disconnectSync,
  testSyncConnection,
  runPostgresSync,
} from "../../lib/sync";

export default function SettingsScreen() {
  // Alarm states
  const [alarmActive, setAlarmActive] = useState(true);
  const [customSoundUri, setSoundUriState] = useState<string | null>(null);
  const [soundFileName, setSoundFileName] = useState<string>("Default Chime");
  const [isPlayingPreview, setIsPlayingPreview] = useState<boolean>(false);
  const [previewPlayer, setPreviewPlayer] = useState<AudioPlayer | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);

  // Backup & Restore states
  const [lastBackupDate, setLastBackupDateState] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Cloud Sync states
  const [isConfigured, setIsConfigured] = useState(false);
  const [syncUrlInput, setSyncUrlInput] = useState("");
  const [autoSyncActive, setAutoSyncActive] = useState(true);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [isTestingSync, setIsTestingSync] = useState(false);
  const [isSyncingNow, setIsSyncingNow] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Router, Tablet layout & Update state
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width > 768;
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const appVersion = Application.nativeApplicationVersion || CURRENT_VERSION;

  const handleCheckForUpdates = async () => {
    if (isCheckingUpdate) return;
    setIsCheckingUpdate(true);
    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
      const res = await checkMobileUpdate(true);
      if (res.hasUpdate) {
        Alert.alert(
          "Update Available",
          `CluaNote ${res.latestVersion} is now available (current: v${res.currentVersion}).`,
          [
            { text: "Later", style: "cancel" },
            {
              text: "View Release",
              onPress: () => Linking.openURL(res.releaseUrl),
            },
          ]
        );
      } else {
        Alert.alert("Up to Date", `CluaNote v${res.currentVersion} is the latest version.`);
      }
    } catch {
      Alert.alert("Check Failed", "Could not check for updates. Please check your internet connection.");
    } finally {
      setIsCheckingUpdate(false);
    }
  };
  useEffect(() => {
    let isMounted = true;

    async function loadAllSettings() {
      try {
        // Alarms
        const enabled = await isAlarmEnabled();
        const soundUri = await getCustomSoundUri();
        if (isMounted) {
          setAlarmActive(enabled);
          setSoundUriState(soundUri);
          if (soundUri) {
            const parts = soundUri.split("/");
            const rawName = parts[parts.length - 1] || "Custom Audio";
            const cleanName = rawName.replace(/^custom_alarm_\d+_/, "");
            setSoundFileName(decodeURIComponent(cleanName));
          } else {
            setSoundFileName("Default Chime");
          }
        }

        // Backup
        const backupDate = await getLastBackupDate();
        if (isMounted) {
          setLastBackupDateState(backupDate);
        }

        // Sync
        const syncConf = await getSyncConfig();
        if (isMounted) {
          setIsConfigured(syncConf.isConfigured);
          setAutoSyncActive(syncConf.autoSync);
          setLastSyncedAt(syncConf.lastSyncedAt);
          if (syncConf.url) {
            setSyncUrlInput(syncConf.url);
          }
        }
      } catch (err) {
        console.warn("Failed to load settings:", err);
      }
    }

    loadAllSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  // Stop preview sound on unmount
  useEffect(() => {
    return () => {
      if (previewPlayer) {
        try {
          previewPlayer.pause();
          previewPlayer.release();
        } catch {}
      }
    };
  }, [previewPlayer]);

  // --------------------------------------------------------------------------
  // Alarm Handlers
  // --------------------------------------------------------------------------
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

  const handleToggleSoundPreview = async () => {
    try {
      if (isPlayingPreview) {
        if (previewPlayer) {
          try {
            previewPlayer.pause();
            previewPlayer.release();
          } catch {}
          setPreviewPlayer(null);
        }
        setIsPlayingPreview(false);
        return;
      }

      if (!customSoundUri) {
        Alert.alert("Default Sound", "The default system sound will be used for alarms.");
        return;
      }

      const player = createAudioPlayer({ uri: customSoundUri });
      player.volume = 1.0;
      player.loop = false;
      setPreviewPlayer(player);
      setIsPlayingPreview(true);

      player.addListener("playbackStatusUpdate", (status) => {
        if (status.didJustFinish) {
          setIsPlayingPreview(false);
          try {
            player.release();
          } catch {}
          setPreviewPlayer(null);
        }
      });

      player.play();
    } catch (err) {
      console.warn("Failed to preview sound:", err);
      setIsPlayingPreview(false);
    }
  };

  const handleResetSound = async () => {
    if (previewPlayer) {
      try {
        previewPlayer.pause();
        previewPlayer.release();
      } catch {}
      setPreviewPlayer(null);
      setIsPlayingPreview(false);
    }
    await setCustomSoundUri(null);
    setSoundUriState(null);
    setSoundFileName("Default Chime");
  };

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

  // --------------------------------------------------------------------------
  // Backup & Restore Handlers
  // --------------------------------------------------------------------------
  const handleExportBackup = async () => {
    try {
      setIsExporting(true);
      await exportBackup();
      const updatedDate = await getLastBackupDate();
      setLastBackupDateState(updatedDate);
    } catch (err) {
      console.error("Failed to export backup:", err);
      Alert.alert("Export Failed", err instanceof Error ? err.message : "Could not export backup.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportBackup = async () => {
    try {
      setIsImporting(true);
      const file = await pickBackupFile();
      if (!file) {
        setIsImporting(false);
        return;
      }

      const info = inspectBackupJson(file.content);
      if (info.count === 0) {
        Alert.alert("Empty File", "The selected file does not contain any valid tasks.");
        setIsImporting(false);
        return;
      }

      Alert.alert(
        "Restore Backup",
        `Found ${info.count} task(s) in "${file.name}".\n\nExisting tasks will be updated non-destructively only if the backup contains newer edits. Proceed?`,
        [
          { text: "Cancel", style: "cancel", onPress: () => setIsImporting(false) },
          {
            text: "Restore",
            style: "default",
            onPress: async () => {
              try {
                const count = await restoreTasksFromJson(file.content);
                const updatedDate = await getLastBackupDate();
                setLastBackupDateState(updatedDate);
                Alert.alert("Restore Complete", `Successfully processed and merged ${count} task(s).`);
              } catch (importErr) {
                Alert.alert("Import Error", importErr instanceof Error ? importErr.message : "Failed to parse tasks.");
              } finally {
                setIsImporting(false);
              }
            },
          },
        ]
      );
    } catch (err) {
      console.error("Import file pick error:", err);
      Alert.alert("Import Failed", "Failed to read backup file.");
      setIsImporting(false);
    }
  };

  // --------------------------------------------------------------------------
  // Cloud Sync Handlers
  // --------------------------------------------------------------------------
  const handleTestSync = async () => {
    if (!syncUrlInput.trim()) {
      Alert.alert("Input Required", "Please enter a PostgreSQL or Sync Server connection URL.");
      return;
    }

    try {
      setIsTestingSync(true);
      setSyncStatus(null);
      const res = await testSyncConnection(syncUrlInput.trim());
      setSyncStatus({ type: "success", text: res.message });
      Alert.alert("Connection Verified", res.message);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setSyncStatus({ type: "error", text: msg });
      Alert.alert("Connection Failed", msg);
    } finally {
      setIsTestingSync(false);
    }
  };

  const handleSaveAndSync = async () => {
    if (!syncUrlInput.trim()) {
      Alert.alert("Input Required", "Please enter a connection URL.");
      return;
    }

    try {
      setIsSyncingNow(true);
      setSyncStatus(null);
      await saveSyncConfig(syncUrlInput.trim(), autoSyncActive);
      setIsConfigured(true);

      const res = await runPostgresSync();
      setLastSyncedAt(res.syncedAt);
      setSyncStatus({ type: "success", text: res.message });
      Alert.alert("Sync Successful", res.message);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setSyncStatus({ type: "error", text: msg });
      Alert.alert("Sync Error", msg);
    } finally {
      setIsSyncingNow(false);
    }
  };

  const handleManualSync = async () => {
    try {
      setIsSyncingNow(true);
      setSyncStatus(null);
      const res = await runPostgresSync();
      setLastSyncedAt(res.syncedAt);
      setSyncStatus({ type: "success", text: res.message });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setSyncStatus({ type: "error", text: msg });
      Alert.alert("Sync Failed", msg);
    } finally {
      setIsSyncingNow(false);
    }
  };

  const handleToggleAutoSync = async (val: boolean) => {
    setAutoSyncActive(val);
    if (syncUrlInput.trim()) {
      await saveSyncConfig(syncUrlInput.trim(), val);
    }
  };

  const handleDisconnect = async () => {
    Alert.alert(
      "Disconnect Sync",
      "Remove stored synchronization configuration? Your local tasks will remain safe on your device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: async () => {
            await disconnectSync();
            setIsConfigured(false);
            setSyncUrlInput("");
            setSyncStatus(null);
          },
        },
      ]
    );
  };

  const formatIsoDate = (isoStr: string | null) => {
    if (!isoStr) return "Never";
    try {
      return format(parseISO(isoStr), "MMM d, yyyy h:mm a");
    } catch {
      return isoStr;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#090d16] px-4 pt-2">
      <Text className="text-2xl font-bold text-white tracking-tight mb-4">
        Settings
      </Text>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View className={isTablet ? "max-w-3xl mx-auto w-full" : "w-full"}>
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
            Minimalist, dark glassmorphic task & schedule manager. Fast on-device SQLite database with background alarms, cloud sync, and JSON backup.
          </Text>
        </View>

        {/* ------------------------------------------------------------------ */}
        {/* PostgreSQL Cloud Sync Section */}
        {/* ------------------------------------------------------------------ */}
        <View className="flex-row items-center justify-between mb-2 ml-1">
          <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
            Cloud & PostgreSQL Sync
          </Text>
          {isConfigured ? (
            <View className="flex-row items-center space-x-1">
              <View className="w-2 h-2 rounded-full bg-emerald-400" />
              <Text className="text-emerald-400 text-xs font-semibold">Active</Text>
            </View>
          ) : (
            <Text className="text-slate-500 text-xs font-medium">Not Connected</Text>
          )}
        </View>

        <View className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-4 mb-4">
          <Text className="text-slate-300 text-xs mb-3 leading-relaxed">
            Bi-directional sync pulls the newest changes from the cloud first, prevents overwriting newer data, and pushes your recent edits.
          </Text>

          {/* Database / Sync Server URL Input */}
          <Text className="text-slate-400 text-xs font-medium mb-1">
            Database / Server URL
          </Text>
          <TextInput
            value={syncUrlInput}
            onChangeText={setSyncUrlInput}
            placeholder="postgresql://user:pass@ep-xyz.neon.tech/neondb"
            placeholderTextColor="#475569"
            autoCapitalize="none"
            autoCorrect={false}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-xs font-mono mb-3"
          />

          {syncStatus ? (
            <View
              className={`p-2.5 rounded-xl mb-3 ${
                syncStatus.type === "success"
                  ? "bg-emerald-500/10 border border-emerald-500/30"
                  : "bg-rose-500/10 border border-rose-500/30"
              }`}
            >
              <Text
                className={`text-xs ${
                  syncStatus.type === "success" ? "text-emerald-300" : "text-rose-300"
                }`}
              >
                {syncStatus.text}
              </Text>
            </View>
          ) : null}

          {/* Action Buttons */}
          <View className="flex-row items-center space-x-2 mb-3">
            <TouchableOpacity
              onPress={handleTestSync}
              disabled={isTestingSync || isSyncingNow}
              activeOpacity={0.7}
              className="flex-1 py-2 px-3 rounded-xl bg-white/10 border border-white/10 flex-row items-center justify-center space-x-1.5"
            >
              {isTestingSync ? (
                <ActivityIndicator size="small" color="#94a3b8" />
              ) : (
                <>
                  <Ionicons name="wifi-outline" size={15} color="#94a3b8" />
                  <Text className="text-slate-200 text-xs font-semibold">Test Connection</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={isConfigured ? handleManualSync : handleSaveAndSync}
              disabled={isTestingSync || isSyncingNow}
              activeOpacity={0.7}
              className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 flex-row items-center justify-center space-x-1.5"
            >
              {isSyncingNow ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="sync-outline" size={15} color="#ffffff" />
                  <Text className="text-white text-xs font-bold">
                    {isConfigured ? "Sync Now" : "Connect & Sync"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Auto-Sync Toggle & Disconnect */}
          <View className="pt-2 border-t border-white/[0.06] flex-row items-center justify-between">
            <View className="flex-1 pr-2">
              <Text className="text-white text-xs font-medium">Automatic Background Sync</Text>
              <Text className="text-slate-400 text-[11px]">Sync on app open & periodically</Text>
            </View>
            <Switch
              value={autoSyncActive}
              onValueChange={handleToggleAutoSync}
              trackColor={{ false: "#1e293b", true: "#4f46e5" }}
              thumbColor={autoSyncActive ? "#818cf8" : "#64748b"}
            />
          </View>

          <View className="pt-2 mt-2 border-t border-white/[0.06] flex-row items-center justify-between">
            <Text className="text-slate-400 text-xs">
              Last synced: <Text className="text-slate-200 font-medium">{formatIsoDate(lastSyncedAt)}</Text>
            </Text>
            {isConfigured ? (
              <TouchableOpacity onPress={handleDisconnect} activeOpacity={0.7}>
                <Text className="text-rose-400 text-xs font-semibold">Disconnect</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* ------------------------------------------------------------------ */}
        {/* Backup & Restore Section */}
        {/* ------------------------------------------------------------------ */}
        <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 ml-1">
          Backup & Restore
        </Text>
        <View className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-4 mb-4">
          <Text className="text-slate-300 text-xs mb-3 leading-relaxed">
            Export a full JSON backup of your tasks to Google Drive, iCloud, or local files. Restoring merges tasks safely using timestamp conflict resolution.
          </Text>

          <View className="flex-row items-center space-x-2 mb-3">
            <TouchableOpacity
              onPress={handleExportBackup}
              disabled={isExporting || isImporting}
              activeOpacity={0.7}
              className="flex-1 py-2.5 px-3 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex-row items-center justify-center space-x-2"
            >
              {isExporting ? (
                <ActivityIndicator size="small" color="#818cf8" />
              ) : (
                <>
                  <Ionicons name="share-outline" size={16} color="#818cf8" />
                  <Text className="text-indigo-200 text-xs font-semibold">Export Backup</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleImportBackup}
              disabled={isExporting || isImporting}
              activeOpacity={0.7}
              className="flex-1 py-2.5 px-3 rounded-xl bg-white/10 border border-white/10 flex-row items-center justify-center space-x-2"
            >
              {isImporting ? (
                <ActivityIndicator size="small" color="#e2e8f0" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={16} color="#e2e8f0" />
                  <Text className="text-slate-200 text-xs font-semibold">Import Backup</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View className="pt-2 border-t border-white/[0.06] flex-row items-center justify-between">
            <Text className="text-slate-400 text-xs">
              Last backup: <Text className="text-slate-200 font-medium">{formatIsoDate(lastBackupDate)}</Text>
            </Text>
          </View>
        </View>

        {/* ------------------------------------------------------------------ */}
        {/* Alarms & Notifications Section */}
        {/* ------------------------------------------------------------------ */}
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

        {/* ------------------------------------------------------------------ */}
        {/* Updates & Release Notes Section */}
        {/* ------------------------------------------------------------------ */}
        <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 ml-1">
          Updates & Changelog
        </Text>
        <View className="rounded-2xl bg-white/[0.04] border border-white/[0.08] overflow-hidden mb-4">
          <TouchableOpacity
            onPress={() => router.push("/modal/release-notes")}
            accessibilityRole="button"
            accessibilityLabel="Release notes and changelog"
            activeOpacity={0.7}
            className="p-3.5 border-b border-white/[0.06] flex-row items-center justify-between"
          >
            <View className="flex-row items-center space-x-3">
              <Ionicons name="newspaper-outline" size={18} color="#818cf8" />
              <Text className="text-white text-sm">Release Notes</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleCheckForUpdates}
            disabled={isCheckingUpdate}
            accessibilityRole="button"
            accessibilityLabel="Check for software updates"
            activeOpacity={0.7}
            className="p-3.5 flex-row items-center justify-between"
          >
            <View className="flex-row items-center space-x-3">
              <Ionicons name="cloud-download-outline" size={18} color="#818cf8" />
              <Text className="text-white text-sm">Check for Updates</Text>
            </View>
            <View className="flex-row items-center space-x-1.5">
              {isCheckingUpdate ? (
                <ActivityIndicator size="small" color="#818cf8" />
              ) : (
                <>
                  <Text className="text-indigo-400 text-xs font-semibold">v{appVersion}</Text>
                  <Ionicons name="chevron-forward" size={14} color="#64748b" />
                </>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* ------------------------------------------------------------------ */}
        {/* About CluaNote Section */}
        {/* ------------------------------------------------------------------ */}
        <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 ml-1">
          About CluaNote
        </Text>
        <View className="rounded-2xl bg-white/[0.04] border border-white/[0.08] overflow-hidden mb-6">
          <View className="p-3.5 border-b border-white/[0.06] flex-row items-center justify-between">
            <View className="flex-row items-center space-x-3">
              <Ionicons name="information-circle-outline" size={18} color="#818cf8" />
              <Text className="text-white text-sm">Application</Text>
            </View>
            <Text className="text-slate-300 text-xs font-medium">CluaNote Mobile v{appVersion}</Text>
          </View>

          <View className="p-3.5 border-b border-white/[0.06] flex-row items-center justify-between">
            <View className="flex-row items-center space-x-3">
              <Ionicons name="person-outline" size={18} color="#818cf8" />
              <Text className="text-white text-sm">Created By</Text>
            </View>
            <Text className="text-slate-300 text-xs font-medium">Subham Maity</Text>
          </View>

          <TouchableOpacity
            onPress={() => Linking.openURL(`https://github.com/${GITHUB_REPO}`)}
            accessibilityRole="button"
            accessibilityLabel="Open GitHub repository"
            activeOpacity={0.7}
            className="p-3.5 border-b border-white/[0.06] flex-row items-center justify-between"
          >
            <View className="flex-row items-center space-x-3">
              <Ionicons name="logo-github" size={18} color="#818cf8" />
              <Text className="text-white text-sm">GitHub Repository</Text>
            </View>
            <Ionicons name="open-outline" size={14} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => Linking.openURL("https://x.com/subham_maity_")}
            accessibilityRole="button"
            accessibilityLabel="Open Twitter profile"
            activeOpacity={0.7}
            className="p-3.5 border-b border-white/[0.06] flex-row items-center justify-between"
          >
            <View className="flex-row items-center space-x-3">
              <Ionicons name="logo-twitter" size={18} color="#818cf8" />
              <Text className="text-white text-sm">Twitter / X (@subham_maity_)</Text>
            </View>
            <Ionicons name="open-outline" size={14} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => Linking.openURL("https://instagram.com/subham_maity")}
            accessibilityRole="button"
            accessibilityLabel="Open Instagram profile"
            activeOpacity={0.7}
            className="p-3.5 border-b border-white/[0.06] flex-row items-center justify-between"
          >
            <View className="flex-row items-center space-x-3">
              <Ionicons name="logo-instagram" size={18} color="#818cf8" />
              <Text className="text-white text-sm">Instagram (@subham_maity)</Text>
            </View>
            <Ionicons name="open-outline" size={14} color="#64748b" />
          </TouchableOpacity>

          <View className="p-3.5 flex-row items-center justify-between">
            <View className="flex-row items-center space-x-3">
              <Ionicons name="ribbon-outline" size={18} color="#818cf8" />
              <Text className="text-white text-sm">License</Text>
            </View>
            <Text className="text-slate-400 text-xs">MIT License • Open Source</Text>
          </View>
        </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

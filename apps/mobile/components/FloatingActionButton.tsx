import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Animated,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

interface FloatingActionButtonProps {
  onPress?: () => void;
  currentDate?: string;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onPress,
  currentDate,
}) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const animValue = useRef(new Animated.Value(0)).current;

  const toggleOpen = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }

    const toValue = isOpen ? 0 : 1;
    Animated.spring(animValue, {
      toValue,
      friction: 6,
      tension: 60,
      useNativeDriver: true,
    }).start();

    setIsOpen(!isOpen);
  };

  const closeMenu = () => {
    if (!isOpen) return;
    Animated.timing(animValue, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      setIsOpen(false);
    });
  };

  const handleAddTask = () => {
    closeMenu();
    if (onPress) {
      onPress();
    } else {
      router.push({
        pathname: "/modal/add-task",
        params: currentDate ? { date: currentDate } : undefined,
      });
    }
  };

  const handleAddFutureNote = () => {
    closeMenu();
    router.push({
      pathname: "/modal/add-task",
      params: { is_future_note: "1" },
    });
  };

  // Interpolations
  const rotation = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "45deg"],
  });

  const secondaryTranslateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [20, -70],
  });

  const secondaryOpacity = animValue.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 0.5, 1],
  });

  const secondaryScale = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  });

  return (
    <>
      {/* Backdrop to collapse when tapping outside */}
      {isOpen ? (
        <Pressable
          onPress={closeMenu}
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: "rgba(0,0,0,0.4)",
            zIndex: 45,
          }}
        />
      ) : null}

      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          bottom: 24,
          right: 20,
          alignItems: "center",
          zIndex: 50,
        }}
      >
        {/* Secondary FAB: Future Note */}
        <Animated.View
          style={{
            position: "absolute",
            bottom: 0,
            opacity: secondaryOpacity,
            transform: [
              { translateY: secondaryTranslateY },
              { scale: secondaryScale },
            ],
            pointerEvents: isOpen ? "auto" : "none",
          }}
        >
          <View className="flex-row items-center space-x-2">
            <View className="px-2.5 py-1 rounded-lg bg-slate-900/90 border border-white/10 shadow-lg">
              <Text className="text-white text-xs font-semibold">Future Note</Text>
            </View>
            <TouchableOpacity
              onPress={handleAddFutureNote}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Create future note"
              accessibilityHint="Opens editor to create a Kanban note not tied to a specific date"
              className="w-12 h-12 rounded-full bg-violet-600 items-center justify-center shadow-lg shadow-violet-600/40 border border-violet-400"
            >
              <Ionicons name="document-text" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Primary FAB: Toggle / Add Task */}
        <TouchableOpacity
          onPress={toggleOpen}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={isOpen ? "Close actions menu" : "Open add actions"}
          accessibilityHint="Expands options to add a daily task or a future note"
          className="w-14 h-14 rounded-full bg-indigo-600 items-center justify-center shadow-2xl shadow-indigo-500/60 border border-indigo-400"
        >
          <Animated.View style={{ transform: [{ rotate: rotation }] }}>
            <Ionicons name="add" size={28} color="white" />
          </Animated.View>
        </TouchableOpacity>
      </View>
    </>
  );
};

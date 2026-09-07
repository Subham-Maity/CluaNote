import React from "react";
import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface FloatingActionButtonProps {
  onPress: () => void;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onPress,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      className="absolute bottom-6 right-5 w-14 h-14 rounded-full bg-indigo-600 items-center justify-center shadow-xl shadow-indigo-500/50 border border-indigo-400 z-50"
    >
      <Ionicons name="add" size={28} color="white" />
    </TouchableOpacity>
  );
};

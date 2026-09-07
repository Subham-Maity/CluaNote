const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo
config.watchFolders = [monorepoRoot];

// 2. Resolve packages from both local and root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

try {
  const nativewindPath = require.resolve("nativewind", { paths: [projectRoot] });
  const cssInteropDir = path.dirname(
    require.resolve("react-native-css-interop/package.json", {
      paths: [nativewindPath],
    })
  );
  config.resolver.extraNodeModules = {
    ...config.resolver.extraNodeModules,
    "react-native-css-interop": cssInteropDir,
    punycode: require.resolve("punycode", { paths: [projectRoot] }),
  };
} catch (e) {
  // fallback
}

module.exports = withNativeWind(config, { input: "./global.css" });

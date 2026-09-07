const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");
const fs = require("fs");

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

// 3. In pnpm monorepos, Metro's Babel transform worker subprocess cannot
//    resolve @babel/plugin-* because they live in pnpm's virtual store.
//    We map them via extraNodeModules so Metro can always find them.
try {
  const extraModules = {};

  // Find babel-preset-expo location.
  // In pnpm, @babel/* packages live as siblings at the same level as babel-preset-expo
  // in the virtual store (node_modules/.pnpm/.../node_modules/@babel/), not inside
  // babel-preset-expo/node_modules/@babel/.
  const babelPresetExpoDir = path.dirname(
    require.resolve("babel-preset-expo/package.json", { paths: [projectRoot] })
  );
  // Go up from babel-preset-expo/ to the node_modules/ dir, then into @babel/
  const babelPkgRoot = path.resolve(babelPresetExpoDir, "..", "@babel");
  if (fs.existsSync(babelPkgRoot)) {
    for (const pkg of fs.readdirSync(babelPkgRoot)) {
      extraModules[`@babel/${pkg}`] = path.join(babelPkgRoot, pkg);
    }
  }

  // Also map from local apps/mobile/node_modules/@babel if present
  const localBabelDir = path.resolve(projectRoot, "node_modules", "@babel");
  if (fs.existsSync(localBabelDir)) {
    for (const pkg of fs.readdirSync(localBabelDir)) {
      if (!extraModules[`@babel/${pkg}`]) {
        extraModules[`@babel/${pkg}`] = path.join(localBabelDir, pkg);
      }
    }
  }

  // Also map from monorepo root node_modules/@babel
  const rootBabelDir = path.resolve(monorepoRoot, "node_modules", "@babel");
  if (fs.existsSync(rootBabelDir)) {
    for (const pkg of fs.readdirSync(rootBabelDir)) {
      if (!extraModules[`@babel/${pkg}`]) {
        extraModules[`@babel/${pkg}`] = path.join(rootBabelDir, pkg);
      }
    }
  }

  // Map react-native-css-interop from nativewind's deps
  const nativewindPath = require.resolve("nativewind", { paths: [projectRoot] });
  const cssInteropDir = path.dirname(
    require.resolve("react-native-css-interop/package.json", {
      paths: [nativewindPath],
    })
  );
  extraModules["react-native-css-interop"] = cssInteropDir;

  // Map punycode (required by markdown-it)
  try {
    extraModules["punycode"] = path.dirname(
      require.resolve("punycode/package.json", { paths: [projectRoot] })
    );
  } catch (_) {}

  config.resolver.extraNodeModules = {
    ...config.resolver.extraNodeModules,
    ...extraModules,
  };
} catch (e) {
  console.warn("[metro.config.js] extraNodeModules setup failed:", e.message);
}

module.exports = withNativeWind(config, { input: "./global.css" });

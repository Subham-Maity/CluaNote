import { registerVersionGetter } from "@cluanote/shared";
import { getVersion } from "@tauri-apps/api/app";

registerVersionGetter(async () => {
  try {
    return await getVersion();
  } catch {
    return "";
  }
});

export * from "@cluanote/shared";

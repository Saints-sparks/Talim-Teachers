/**
 * The portal's version, from `package.json`. Shown under Settings → About as
 * "Version 1.5.0".
 */
import packageJson from "../../package.json";

/** The version in `package.json` (e.g. `1.5.0`). */
export const APP_VERSION: string = packageJson.version;

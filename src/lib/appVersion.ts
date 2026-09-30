/**
 * The portal's version, from `package.json`. Shown under Settings → About and
 * sent with every support ticket so the team knows which release a report is
 * about.
 */
import packageJson from "../../package.json";

/** The version in `package.json` (e.g. `0.1.0`). */
export const APP_VERSION: string = packageJson.version;

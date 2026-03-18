// This file is kept for backward compatibility but no longer exports mock data.
// All data is now managed through src/lib/store.ts with localStorage persistence.
// Protocol definitions moved to src/lib/protocols.ts

export { defaultProtocols as protocols } from './protocols';
export { getServerConfig as getServerConfigLive } from './store';

// Re-export for pages that still import these
import { getServerConfig, getSiteSettings } from './store';

export const serverConfig = getServerConfig();
export const defaultSiteSettings = getSiteSettings();

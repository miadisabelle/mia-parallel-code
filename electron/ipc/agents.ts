import { execFile } from 'child_process';
import { promisify } from 'util';

import type { AgentDef } from './shared-types.js';
import { DEFAULT_AGENTS } from './agent-defaults.js';

const execFileAsync = promisify(execFile);

// The agent table and the skip-permissions resolver live in ./agent-defaults so
// the renderer can share them; re-exported here for the main-process callers
// that already import from this module.
export { getSkipPermissionsArgs } from './agent-defaults.js';

async function isCommandAvailable(command: string): Promise<boolean> {
  try {
    await execFileAsync('which', [command], { encoding: 'utf8', timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

// TTL cache to avoid repeated `which` calls
let cachedAgents: AgentDef[] | null = null;
let cacheTime = 0;
const AGENT_CACHE_TTL = 30_000;

export async function listAgents(): Promise<AgentDef[]> {
  const now = Date.now();
  if (cachedAgents && now - cacheTime < AGENT_CACHE_TTL) {
    return cachedAgents;
  }

  cachedAgents = await Promise.all(
    DEFAULT_AGENTS.map(async (agent) => ({
      ...agent,
      available: await isCommandAvailable(agent.command),
    })),
  );
  cacheTime = now;
  return cachedAgents;
}

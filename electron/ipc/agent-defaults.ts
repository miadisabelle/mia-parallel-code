// Built-in agent definitions and the skip-permissions resolver.
//
// Pure data and pure functions — no Node or Electron imports — so the renderer
// can answer "which flag makes this agent stop asking for permission?" without
// an IPC round-trip.  Both processes must agree on that answer: when they don't,
// a task carrying skipPermissions: true launches its agent bare and the user is
// back to confirming every tool call (#7).  See .dependency-cruiser.cjs, which
// allows src/ to import this module for exactly that reason.

import type { AgentDef } from './shared-types.js';

export const DEFAULT_AGENTS: AgentDef[] = [
  {
    id: 'claude-code',
    name: 'Claude Code',
    command: 'claude',
    args: [],
    resume_args: ['--continue'],
    skip_permissions_args: ['--dangerously-skip-permissions'],
    description: "Anthropic's Claude Code CLI agent",
  },
  {
    id: 'codex',
    name: 'Codex CLI',
    command: 'codex',
    args: [],
    resume_args: ['resume', '--last'],
    skip_permissions_args: ['--dangerously-bypass-approvals-and-sandbox'],
    description: "OpenAI's Codex CLI agent",
  },
  {
    id: 'gemini',
    name: 'Gemini CLI',
    command: 'gemini',
    args: [],
    resume_args: ['--resume', 'latest'],
    skip_permissions_args: ['--yolo'],
    description: "Google's Gemini CLI agent",
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    command: 'opencode',
    args: [],
    resume_args: [],
    skip_permissions_args: [],
    description: 'Open source AI coding agent (opencode.ai)',
  },
  {
    id: 'copilot',
    name: 'Copilot CLI',
    command: 'copilot',
    args: [],
    resume_args: ['--continue'],
    skip_permissions_args: ['--yolo'],
    description: "GitHub's Copilot CLI agent",
    // Copilot CLI shows up to two init dialogs (folder trust + instructions init)
    // before reaching its real prompt.  A modest stability delay lets the prompt
    // settle before sending, without being so long that the user notices the wait.
    prompt_ready_delay_ms: 1_000,
  },
  {
    id: 'antigravity',
    name: 'Antigravity CLI',
    command: 'agy',
    args: [],
    resume_args: ['-c'],
    skip_permissions_args: ['--dangerously-skip-permissions'],
    description: "Google's Antigravity CLI agent (successor to Gemini CLI)",
    // Antigravity paints a TUI that needs a beat to settle before auto-send.
    prompt_ready_delay_ms: 1_000,
  },
];

/** Skip-permissions flags for a built-in agent, matched on the command name.
 *  Accepts a bare command or an absolute path; unknown commands yield []. */
export function getSkipPermissionsArgs(command: string): string[] {
  // Not path.basename(): this module stays importable from the renderer bundle,
  // and Parallel Code ships macOS/Linux only, so '/' is the only separator.
  const base = command.split('/').pop() ?? command;
  const agent = DEFAULT_AGENTS.find((a) => a.command === base || a.command === command);
  return agent ? [...agent.skip_permissions_args] : [];
}

/**
 * Skip-permissions flags to launch `def` with.
 *
 * Prefers the def's own args, then falls back to the built-in table for its
 * command.  The fallback matters because AgentDefs reach launch sites in
 * degraded forms — restored from an older profile, or synthesised from a bare
 * command by the MCP sub-task listener — and an empty skip_permissions_args
 * would otherwise silently downgrade an explicit skipPermissions: true into a
 * normal, prompt-on-every-tool launch.
 */
export function resolveSkipPermissionsArgs(
  def: Pick<AgentDef, 'command'> & Partial<Pick<AgentDef, 'skip_permissions_args'>>,
): string[] {
  return def.skip_permissions_args?.length
    ? [...def.skip_permissions_args]
    : getSkipPermissionsArgs(def.command);
}

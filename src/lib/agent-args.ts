import type { AgentDef } from '../ipc/types';
import type { Task } from '../store/types';
import { resolveSkipPermissionsArgs } from '../../electron/ipc/agent-defaults';

function isCodexCommand(command: string): boolean {
  return command.split('/').pop()?.includes('codex') === true;
}

function isAntigravityCommand(command: string): boolean {
  return command.split('/').pop() === 'agy';
}

function isCopilotCommand(command: string): boolean {
  return command.split('/').pop() === 'copilot';
}

const RESUME_FAILURE_PATTERNS: Record<string, string[]> = {
  claude: ['No conversation found to continue'],
};

export function isResumeArgsFailure(command: string, lastOutput: string[]): boolean {
  const base = command.split('/').pop() ?? command;
  const patterns = RESUME_FAILURE_PATTERNS[base];
  if (!patterns || lastOutput.length === 0) return false;
  const text = lastOutput.join('\n');
  return patterns.some((pattern) => text.includes(pattern));
}

function legacyMcpConfigArgs(command: string, mcpConfigPath: string | undefined): string[] {
  // Codex and Antigravity have no `--mcp-config` flag; passing it would break launch.
  if (!mcpConfigPath || isCodexCommand(command) || isAntigravityCommand(command)) return [];
  // Copilot has no `--mcp-config` flag either — it exits with "unknown option" (#146).
  // Use its `--additional-mcp-config <@file>` flag, which takes the same config shape.
  if (isCopilotCommand(command)) return ['--additional-mcp-config', `@${mcpConfigPath}`];
  return ['--mcp-config', mcpConfigPath];
}

export function buildTaskAgentArgs(
  agentDef: AgentDef,
  task: Pick<Task, 'skipPermissions' | 'mcpConfigPath' | 'mcpLaunchArgs'>,
  resumed: boolean,
): string[] {
  return [
    ...(resumed && agentDef.resume_args?.length ? (agentDef.resume_args ?? []) : agentDef.args),
    // Resolve rather than read agentDef.skip_permissions_args directly: a def
    // restored from an older profile or synthesised from a bare command carries
    // no skip args, and reading it straight would turn an explicit
    // skipPermissions: true into a launch that prompts on every tool call (#7).
    ...(task.skipPermissions ? resolveSkipPermissionsArgs(agentDef) : []),
    ...(task.mcpLaunchArgs ?? legacyMcpConfigArgs(agentDef.command, task.mcpConfigPath)),
  ];
}

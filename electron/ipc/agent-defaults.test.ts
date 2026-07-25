import { describe, expect, it } from 'vitest';

import {
  DEFAULT_AGENTS,
  getSkipPermissionsArgs,
  resolveSkipPermissionsArgs,
} from './agent-defaults.js';

describe('getSkipPermissionsArgs', () => {
  it('resolves the flag for a bare command', () => {
    expect(getSkipPermissionsArgs('claude')).toEqual(['--dangerously-skip-permissions']);
    expect(getSkipPermissionsArgs('codex')).toEqual(['--dangerously-bypass-approvals-and-sandbox']);
    expect(getSkipPermissionsArgs('agy')).toEqual(['--dangerously-skip-permissions']);
    expect(getSkipPermissionsArgs('copilot')).toEqual(['--yolo']);
  });

  it('resolves the flag for an absolute path', () => {
    expect(getSkipPermissionsArgs('/usr/local/bin/claude')).toEqual([
      '--dangerously-skip-permissions',
    ]);
  });

  it('returns [] for an agent with no skip-permissions flag', () => {
    expect(getSkipPermissionsArgs('opencode')).toEqual([]);
  });

  it('returns [] for an unknown command', () => {
    expect(getSkipPermissionsArgs('some-other-agent')).toEqual([]);
  });

  it('returns a copy, so a caller cannot mutate the shared table', () => {
    const args = getSkipPermissionsArgs('claude');
    args.push('--mutated');
    expect(getSkipPermissionsArgs('claude')).toEqual(['--dangerously-skip-permissions']);
    expect(DEFAULT_AGENTS.find((a) => a.command === 'claude')?.skip_permissions_args).toEqual([
      '--dangerously-skip-permissions',
    ]);
  });
});

describe('resolveSkipPermissionsArgs', () => {
  it("prefers the def's own args", () => {
    expect(
      resolveSkipPermissionsArgs({ command: 'claude', skip_permissions_args: ['--custom-flag'] }),
    ).toEqual(['--custom-flag']);
  });

  // The #7 regression: a def restored from an older profile, or synthesised from
  // a bare command by the MCP sub-task listener, carries no skip args — and used
  // to downgrade an explicit skipPermissions: true into a prompt-on-every-tool launch.
  it('falls back to the built-in table when the def has an empty list', () => {
    expect(resolveSkipPermissionsArgs({ command: 'claude', skip_permissions_args: [] })).toEqual([
      '--dangerously-skip-permissions',
    ]);
  });

  it('falls back to the built-in table when the def omits the field entirely', () => {
    expect(resolveSkipPermissionsArgs({ command: 'claude' })).toEqual([
      '--dangerously-skip-permissions',
    ]);
  });

  it('resolves a degraded def carrying a full command path', () => {
    expect(resolveSkipPermissionsArgs({ command: '/opt/homebrew/bin/codex' })).toEqual([
      '--dangerously-bypass-approvals-and-sandbox',
    ]);
  });

  it('returns [] for an unknown command with no args of its own', () => {
    expect(resolveSkipPermissionsArgs({ command: 'some-other-agent' })).toEqual([]);
  });
});

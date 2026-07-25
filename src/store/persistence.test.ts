import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentDef } from '../ipc/types';
import type { PersistedTask } from './types';

const { mockInvoke } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
}));

vi.mock('../lib/ipc', () => ({
  invoke: mockInvoke,
}));

import { loadState, resolveIncomingPanelUserSize, saveState } from './persistence';
import { setStore, store } from './core';
import { IPC } from '../../electron/ipc/channels';

function agentDef(overrides: Partial<AgentDef> = {}): AgentDef {
  return {
    id: 'codex',
    name: 'Codex CLI',
    command: 'codex',
    args: [],
    resume_args: ['resume', '--last'],
    skip_permissions_args: [],
    description: 'Codex',
    ...overrides,
  };
}

function persistedTask(def: AgentDef): PersistedTask {
  return {
    id: 'task-1',
    name: 'Task',
    projectId: 'project-1',
    branchName: 'task/task-1',
    worktreePath: '/repo/.worktrees/task-1',
    notes: '',
    lastPrompt: '',
    shellCount: 0,
    agentDef: def,
    gitIsolation: 'worktree',
  };
}

async function loadPersistedAgent(def: AgentDef): Promise<AgentDef> {
  mockInvoke.mockResolvedValueOnce(
    JSON.stringify({
      projects: [{ id: 'project-1', name: 'Repo', path: '/repo', color: 'hsl(0, 70%, 75%)' }],
      lastProjectId: 'project-1',
      lastAgentId: null,
      taskOrder: ['task-1'],
      collapsedTaskOrder: [],
      tasks: {
        'task-1': persistedTask(def),
      },
      activeTaskId: 'task-1',
      sidebarVisible: true,
    }),
  );

  await loadState();

  const agentId = store.tasks['task-1']?.agentIds[0];
  expect(agentId).toBeTruthy();
  return store.agents[agentId as string].def;
}

beforeEach(() => {
  vi.clearAllMocks();
  setStore('projects', []);
  setStore('lastProjectId', null);
  setStore('lastAgentId', null);
  setStore('taskOrder', []);
  setStore('collapsedTaskOrder', []);
  setStore('tasks', {});
  setStore('agents', {});
  setStore('activeTaskId', null);
  setStore('activeAgentId', null);
  setStore('availableAgents', []);
  setStore('customAgents', []);
  setStore('coordinatorControlHintDismissed', false);
  setStore('autoStartRemoteAccess', false);
});

describe('resolveIncomingPanelUserSize', () => {
  it('prefers panelUserSize when both new and legacy are present', () => {
    const result = resolveIncomingPanelUserSize({ 'tiling:a': 200 }, { 'tiling:a': 999 }, true);
    expect(result).toEqual({ 'tiling:a': 200 });
  });

  it('falls back to legacy panelSizes when new field is missing', () => {
    const result = resolveIncomingPanelUserSize(undefined, { 'sidebar:width': 280 }, true);
    expect(result).toEqual({ 'sidebar:width': 280 });
  });

  it('returns empty when neither source is a string->number record', () => {
    expect(resolveIncomingPanelUserSize(null, null, true)).toEqual({});
    expect(resolveIncomingPanelUserSize('nope', 42, true)).toEqual({});
    expect(resolveIncomingPanelUserSize({ x: 'string' }, null, true)).toEqual({});
  });

  it('wipes task:* entries on first v2 migration but keeps tiling:/sidebar: pins', () => {
    const result = resolveIncomingPanelUserSize(
      {
        'task:abc:ai-terminal': 400,
        'task:abc:shell-section': 300,
        'tiling:uuid-1': 520,
        'sidebar:width': 240,
      },
      undefined,
      undefined,
    );
    expect(result).toEqual({
      'tiling:uuid-1': 520,
      'sidebar:width': 240,
    });
  });

  it('passes task:* entries through once the v2 flag is set', () => {
    const result = resolveIncomingPanelUserSize(
      { 'task:abc:prompt': 120, 'tiling:x': 500 },
      undefined,
      true,
    );
    expect(result).toEqual({ 'task:abc:prompt': 120, 'tiling:x': 500 });
  });

  it('migrates legacy panelSizes values too (drops task:* unless flag is set)', () => {
    const result = resolveIncomingPanelUserSize(
      undefined,
      { 'task:xyz:ai-terminal': 300, 'tiling:p': 480 },
      undefined,
    );
    expect(result).toEqual({ 'tiling:p': 480 });
  });

  it('rejects records containing non-finite numbers (NaN / Infinity)', () => {
    const result = resolveIncomingPanelUserSize(
      { 'tiling:a': Number.NaN, 'tiling:b': 200 },
      undefined,
      true,
    );
    expect(result).toEqual({});
  });

  it('rejects records containing negative or absurdly large values', () => {
    expect(resolveIncomingPanelUserSize({ 'tiling:a': -5 }, undefined, true)).toEqual({});
    expect(resolveIncomingPanelUserSize({ 'tiling:a': 1_000_000 }, undefined, true)).toEqual({});
  });

  it('keeps reasonable pixel values through the validator', () => {
    const result = resolveIncomingPanelUserSize(
      { 'tiling:a': 0, 'sidebar:width': 240, 'tiling:b': 15_000 },
      undefined,
      true,
    );
    expect(result).toEqual({
      'tiling:a': 0,
      'sidebar:width': 240,
      'tiling:b': 15_000,
    });
  });
});

describe('loadState agent definition migrations', () => {
  it('migrates persisted Codex --full-auto skip-permissions args', async () => {
    const restored = await loadPersistedAgent(
      agentDef({
        skip_permissions_args: ['--full-auto', '--stale-extra'],
      }),
    );

    expect(restored.skip_permissions_args).toEqual(['--dangerously-bypass-approvals-and-sandbox']);
  });

  it('leaves non-Codex --full-auto skip-permissions args unchanged', async () => {
    const restored = await loadPersistedAgent(
      agentDef({
        id: 'custom-agent',
        name: 'Custom Agent',
        command: 'custom',
        skip_permissions_args: ['--full-auto'],
      }),
    );

    expect(restored.skip_permissions_args).toEqual(['--full-auto']);
  });

  it('leaves current Codex skip-permissions args unchanged', async () => {
    const restored = await loadPersistedAgent(
      agentDef({
        skip_permissions_args: ['--dangerously-bypass-approvals-and-sandbox'],
      }),
    );

    expect(restored.skip_permissions_args).toEqual(['--dangerously-bypass-approvals-and-sandbox']);
  });
});

describe('landing state persistence', () => {
  it('hydrates landed metadata and verification fields', async () => {
    const def = agentDef();
    mockInvoke.mockResolvedValueOnce(
      JSON.stringify({
        projects: [{ id: 'project-1', name: 'Repo', path: '/repo', color: 'hsl(0, 70%, 75%)' }],
        lastProjectId: 'project-1',
        lastAgentId: null,
        taskOrder: ['task-1'],
        collapsedTaskOrder: [],
        tasks: {
          'task-1': {
            ...persistedTask(def),
            coordinatedBy: 'coord-1',
            needsReview: true,
            verification: {
              checks: [{ name: 'test', command: 'npm test', result: 'passed' }],
            },
            landingState: 'landed_pending_review',
            landedMetadata: {
              taskId: 'task-1',
              taskName: 'Task',
              coordinatorTaskId: 'coord-1',
              targetBranch: 'main',
              landedCommit: 'abc123',
              landedAt: '2026-05-24T00:00:00Z',
              landedOrder: 1,
              verification: {
                checks: [{ name: 'test', command: 'npm test', result: 'passed' }],
              },
            },
          },
        },
        activeTaskId: 'task-1',
        sidebarVisible: true,
      }),
    );

    await loadState();

    expect(store.tasks['task-1'].landingState).toBe('landed_pending_review');
    expect(store.tasks['task-1'].landedMetadata?.landedCommit).toBe('abc123');
    expect(store.tasks['task-1'].verification?.checks[0].result).toBe('passed');
  });
});

describe('PR URL persistence', () => {
  it('persists task PR URLs', async () => {
    setStore('taskOrder', ['task-1']);
    setStore('tasks', {
      'task-1': {
        id: 'task-1',
        name: 'Task',
        projectId: 'project-1',
        branchName: 'task/task-1',
        worktreePath: '/repo/.worktrees/task-1',
        agentIds: [],
        shellAgentIds: [],
        notes: '',
        lastPrompt: '',
        gitIsolation: 'worktree',
        prUrl: 'https://github.com/acme/app/pull/12',
      },
    });
    mockInvoke.mockResolvedValueOnce(undefined);

    await saveState();

    const saved = JSON.parse(mockInvoke.mock.calls[0][1].json);
    expect(saved.tasks['task-1'].prUrl).toBe('https://github.com/acme/app/pull/12');
  });

  it('restores task PR URLs', async () => {
    const def = agentDef();
    mockInvoke.mockResolvedValueOnce(
      JSON.stringify({
        projects: [{ id: 'project-1', name: 'Repo', path: '/repo', color: 'hsl(0, 70%, 75%)' }],
        lastProjectId: 'project-1',
        lastAgentId: null,
        taskOrder: ['task-1'],
        collapsedTaskOrder: [],
        tasks: {
          'task-1': {
            ...persistedTask(def),
            prUrl: 'https://github.com/acme/app/pull/12',
          },
        },
        activeTaskId: 'task-1',
        sidebarVisible: true,
      }),
    );

    await loadState();

    expect(store.tasks['task-1'].prUrl).toBe('https://github.com/acme/app/pull/12');
  });
});

// Minimal valid payload — no theme fields — used as a base for theme migration tests.
function basePayload(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    projects: [{ id: 'p1', name: 'Repo', path: '/repo', color: 'hsl(0, 70%, 75%)' }],
    lastProjectId: 'p1',
    lastAgentId: null,
    taskOrder: [],
    collapsedTaskOrder: [],
    tasks: {},
    activeTaskId: null,
    sidebarVisible: true,
    ...overrides,
  });
}

describe('loadState theme persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setStore('projects', []);
    setStore('taskOrder', []);
    setStore('collapsedTaskOrder', []);
    setStore('tasks', {});
    setStore('agents', {});
    setStore('activeTaskId', null);
    setStore('activeAgentId', null);
    setStore('availableAgents', []);
    setStore('customAgents', []);
  });

  it('defaults to dark mode with islands-dark/islands-light when no theme fields saved', async () => {
    mockInvoke.mockResolvedValueOnce(basePayload());
    await loadState();

    expect(store.appearanceMode).toBe('dark');
    expect(store.darkThemePreset).toBe('islands-dark');
    expect(store.lightThemePreset).toBe('islands-light');
    expect(store.darkThemeCustomId).toBeNull();
    expect(store.lightThemeCustomId).toBeNull();
  });

  it('restores explicit appearanceMode values', async () => {
    for (const mode of ['light', 'dark', 'system'] as const) {
      mockInvoke.mockResolvedValueOnce(basePayload({ appearanceMode: mode }));
      await loadState();
      expect(store.appearanceMode).toBe(mode);
    }
  });

  it('falls back to dark for an invalid appearanceMode value', async () => {
    mockInvoke.mockResolvedValueOnce(basePayload({ appearanceMode: 'solarized' }));
    await loadState();
    expect(store.appearanceMode).toBe('dark');
  });

  it('restores a valid darkThemePreset', async () => {
    mockInvoke.mockResolvedValueOnce(
      basePayload({ appearanceMode: 'dark', darkThemePreset: 'classic' }),
    );
    await loadState();
    expect(store.darkThemePreset).toBe('classic');
  });

  it('falls back to islands-dark for an invalid darkThemePreset', async () => {
    mockInvoke.mockResolvedValueOnce(
      basePayload({ appearanceMode: 'dark', darkThemePreset: 'not-a-theme' }),
    );
    await loadState();
    expect(store.darkThemePreset).toBe('islands-dark');
  });

  it('restores a valid lightThemePreset', async () => {
    mockInvoke.mockResolvedValueOnce(
      basePayload({ appearanceMode: 'light', lightThemePreset: 'islands-light' }),
    );
    await loadState();
    expect(store.lightThemePreset).toBe('islands-light');
  });

  it('falls back to islands-light for an invalid lightThemePreset', async () => {
    mockInvoke.mockResolvedValueOnce(
      basePayload({ appearanceMode: 'light', lightThemePreset: 'bogus' }),
    );
    await loadState();
    expect(store.lightThemePreset).toBe('islands-light');
  });

  it('restores customId strings and nulls non-strings', async () => {
    mockInvoke.mockResolvedValueOnce(
      basePayload({
        appearanceMode: 'dark',
        darkThemeCustomId: 'my-custom',
        lightThemeCustomId: 42,
      }),
    );
    await loadState();
    expect(store.darkThemeCustomId).toBe('my-custom');
    expect(store.lightThemeCustomId).toBeNull();
  });

  it('backward compat: old themePreset=islands-light migrates to light mode', async () => {
    mockInvoke.mockResolvedValueOnce(basePayload({ themePreset: 'islands-light' }));
    await loadState();
    expect(store.appearanceMode).toBe('light');
    expect(store.lightThemePreset).toBe('islands-light');
  });

  it('backward compat: old themePreset=classic (dark) migrates to dark mode', async () => {
    mockInvoke.mockResolvedValueOnce(basePayload({ themePreset: 'classic' }));
    await loadState();
    expect(store.appearanceMode).toBe('dark');
    expect(store.darkThemePreset).toBe('classic');
  });

  it('backward compat: invalid old themePreset leaves dark mode with islands-dark', async () => {
    mockInvoke.mockResolvedValueOnce(basePayload({ themePreset: 'legacy-unknown' }));
    await loadState();
    expect(store.appearanceMode).toBe('dark');
    expect(store.darkThemePreset).toBe('islands-dark');
  });
});

describe('coordinator control hint persistence', () => {
  it('does not persist dismissed=false', async () => {
    setStore('coordinatorControlHintDismissed', false);
    mockInvoke.mockResolvedValueOnce(undefined);

    await saveState();

    const saved = JSON.parse(mockInvoke.mock.calls[0][1].json);
    expect(saved.coordinatorControlHintDismissed).toBeUndefined();
  });

  it('persists dismissed=true', async () => {
    setStore('coordinatorControlHintDismissed', true);
    mockInvoke.mockResolvedValueOnce(undefined);

    await saveState();

    const saved = JSON.parse(mockInvoke.mock.calls[0][1].json);
    expect(saved.coordinatorControlHintDismissed).toBe(true);
  });

  it('restores dismissed=true from saved state', async () => {
    mockInvoke.mockResolvedValueOnce(
      JSON.stringify({
        projects: [],
        taskOrder: [],
        collapsedTaskOrder: [],
        tasks: {},
        coordinatorControlHintDismissed: true,
      }),
    );

    await loadState();

    expect(store.coordinatorControlHintDismissed).toBe(true);
  });

  it('defaults to false when not in saved state', async () => {
    mockInvoke.mockResolvedValueOnce(
      JSON.stringify({
        projects: [],
        taskOrder: [],
        collapsedTaskOrder: [],
        tasks: {},
      }),
    );

    await loadState();

    expect(store.coordinatorControlHintDismissed).toBe(false);
  });
});

describe('auto-start remote access persistence', () => {
  it('does not persist autoStartRemoteAccess=false', async () => {
    setStore('autoStartRemoteAccess', false);
    mockInvoke.mockResolvedValueOnce(undefined);

    await saveState();

    const saved = JSON.parse(mockInvoke.mock.calls[0][1].json);
    expect(saved.autoStartRemoteAccess).toBeUndefined();
  });

  it('persists autoStartRemoteAccess=true', async () => {
    setStore('autoStartRemoteAccess', true);
    mockInvoke.mockResolvedValueOnce(undefined);

    await saveState();

    const saved = JSON.parse(mockInvoke.mock.calls[0][1].json);
    expect(saved.autoStartRemoteAccess).toBe(true);
  });

  it('restores the flag and auto-starts the server on load', async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === IPC.LoadAppState) {
        return Promise.resolve(
          JSON.stringify({
            projects: [],
            taskOrder: [],
            collapsedTaskOrder: [],
            tasks: {},
            autoStartRemoteAccess: true,
          }),
        );
      }
      if (channel === IPC.StartRemoteServer) {
        return Promise.resolve({
          url: 'http://x/?token=t',
          wifiUrl: null,
          tailscaleUrl: null,
          port: 7777,
        });
      }
      return Promise.resolve(undefined);
    });

    await loadState();

    expect(store.autoStartRemoteAccess).toBe(true);
    expect(mockInvoke.mock.calls.some((c) => c[0] === IPC.StartRemoteServer)).toBe(true);
  });

  it('does not auto-start the server when the flag is absent', async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === IPC.LoadAppState) {
        return Promise.resolve(
          JSON.stringify({ projects: [], taskOrder: [], collapsedTaskOrder: [], tasks: {} }),
        );
      }
      return Promise.resolve(undefined);
    });

    await loadState();

    expect(store.autoStartRemoteAccess).toBe(false);
    expect(mockInvoke.mock.calls.some((c) => c[0] === IPC.StartRemoteServer)).toBe(false);
  });
});

describe('projects section collapsed persistence', () => {
  it('defaults to expanded when not in saved state', async () => {
    setStore('projectsCollapsed', true);
    mockInvoke.mockResolvedValueOnce(basePayload());

    await loadState();

    expect(store.projectsCollapsed).toBe(false);
  });

  it('restores projectsCollapsed=true from saved state', async () => {
    mockInvoke.mockResolvedValueOnce(basePayload({ projectsCollapsed: true }));

    await loadState();

    expect(store.projectsCollapsed).toBe(true);
  });

  it.each([
    ['string', 'yes'],
    ['number', 1],
    ['null', null],
    ['object', { collapsed: true }],
  ])('ignores a non-boolean projectsCollapsed value (%s)', async (_label, value) => {
    setStore('projectsCollapsed', true);
    mockInvoke.mockResolvedValueOnce(basePayload({ projectsCollapsed: value }));

    await loadState();

    expect(store.projectsCollapsed).toBe(false);
  });

  it('persists the collapsed flag through saveState', async () => {
    setStore('projectsCollapsed', true);
    mockInvoke.mockResolvedValueOnce(undefined);

    await saveState();

    const saved = JSON.parse(mockInvoke.mock.calls[0][1].json);
    expect(saved.projectsCollapsed).toBe(true);
  });
});

describe('new task defaults persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setStore('defaultStepsEnabled', false);
    setStore('defaultSkipPermissions', false);
    setStore('defaultPropagateSkipPermissions', false);
  });

  // --- defaultStepsEnabled ---

  it('defaults defaultStepsEnabled to false when absent from saved state', async () => {
    mockInvoke.mockResolvedValueOnce(basePayload());
    await loadState();
    expect(store.defaultStepsEnabled).toBe(false);
  });

  it('restores defaultStepsEnabled=true from saved state', async () => {
    mockInvoke.mockResolvedValueOnce(basePayload({ defaultStepsEnabled: true }));
    await loadState();
    expect(store.defaultStepsEnabled).toBe(true);
  });

  it('does not persist defaultStepsEnabled=false', async () => {
    setStore('defaultStepsEnabled', false);
    mockInvoke.mockResolvedValueOnce(undefined);
    await saveState();
    const saved = JSON.parse(mockInvoke.mock.calls[0][1].json);
    expect(saved.defaultStepsEnabled).toBeUndefined();
  });

  it('persists defaultStepsEnabled=true', async () => {
    setStore('defaultStepsEnabled', true);
    mockInvoke.mockResolvedValueOnce(undefined);
    await saveState();
    const saved = JSON.parse(mockInvoke.mock.calls[0][1].json);
    expect(saved.defaultStepsEnabled).toBe(true);
  });

  it.each([
    ['string', 'yes'],
    ['number', 1],
    ['null', null],
  ])('ignores non-boolean defaultStepsEnabled (%s)', async (_label, value) => {
    setStore('defaultStepsEnabled', true);
    mockInvoke.mockResolvedValueOnce(basePayload({ defaultStepsEnabled: value }));
    await loadState();
    expect(store.defaultStepsEnabled).toBe(false);
  });

  it('invalid present defaultStepsEnabled does not fall back to showSteps=true', async () => {
    mockInvoke.mockResolvedValueOnce(
      JSON.stringify({
        projects: [],
        taskOrder: [],
        collapsedTaskOrder: [],
        tasks: {},
        showSteps: true,
        defaultStepsEnabled: 'yes',
      }),
    );
    await loadState();
    expect(store.defaultStepsEnabled).toBe(false);
  });

  // --- defaultSkipPermissions ---

  // Fork direction: skip-permissions defaults ON. Legacy profiles (key absent) adopt
  // the fork default; an explicit `false` opt-out is honored and persisted.
  it('defaults defaultSkipPermissions to true when absent from saved state (fork default)', async () => {
    mockInvoke.mockResolvedValueOnce(basePayload());
    await loadState();
    expect(store.defaultSkipPermissions).toBe(true);
  });

  it('restores defaultSkipPermissions=true from saved state', async () => {
    mockInvoke.mockResolvedValueOnce(basePayload({ defaultSkipPermissions: true }));
    await loadState();
    expect(store.defaultSkipPermissions).toBe(true);
  });

  it('restores an explicit defaultSkipPermissions=false opt-out', async () => {
    setStore('defaultSkipPermissions', true);
    mockInvoke.mockResolvedValueOnce(basePayload({ defaultSkipPermissions: false }));
    await loadState();
    expect(store.defaultSkipPermissions).toBe(false);
  });

  it('persists an explicit defaultSkipPermissions=false (opt-out survives)', async () => {
    setStore('defaultSkipPermissions', false);
    mockInvoke.mockResolvedValueOnce(undefined);
    await saveState();
    const saved = JSON.parse(mockInvoke.mock.calls[0][1].json);
    expect(saved.defaultSkipPermissions).toBe(false);
  });

  it('persists defaultSkipPermissions=true', async () => {
    setStore('defaultSkipPermissions', true);
    mockInvoke.mockResolvedValueOnce(undefined);
    await saveState();
    const saved = JSON.parse(mockInvoke.mock.calls[0][1].json);
    expect(saved.defaultSkipPermissions).toBe(true);
  });

  it.each([
    ['string', 'yes'],
    ['number', 1],
    ['null', null],
  ])(
    'falls back to the fork default (true) for non-boolean defaultSkipPermissions (%s)',
    async (_label, value) => {
      setStore('defaultSkipPermissions', false);
      mockInvoke.mockResolvedValueOnce(basePayload({ defaultSkipPermissions: value }));
      await loadState();
      expect(store.defaultSkipPermissions).toBe(true);
    },
  );

  // --- defaultPropagateSkipPermissions ---

  // Fork direction: propagation to coordinator sub-agents defaults ON, mirroring
  // defaultSkipPermissions. Absent/invalid → fork default; explicit `false` honored.
  it('defaults defaultPropagateSkipPermissions to true when absent from saved state (fork default)', async () => {
    mockInvoke.mockResolvedValueOnce(basePayload());
    await loadState();
    expect(store.defaultPropagateSkipPermissions).toBe(true);
  });

  it('restores defaultPropagateSkipPermissions=true from saved state', async () => {
    mockInvoke.mockResolvedValueOnce(basePayload({ defaultPropagateSkipPermissions: true }));
    await loadState();
    expect(store.defaultPropagateSkipPermissions).toBe(true);
  });

  it('restores an explicit defaultPropagateSkipPermissions=false opt-out', async () => {
    setStore('defaultPropagateSkipPermissions', true);
    mockInvoke.mockResolvedValueOnce(basePayload({ defaultPropagateSkipPermissions: false }));
    await loadState();
    expect(store.defaultPropagateSkipPermissions).toBe(false);
  });

  it('persists an explicit defaultPropagateSkipPermissions=false (opt-out survives)', async () => {
    setStore('defaultPropagateSkipPermissions', false);
    mockInvoke.mockResolvedValueOnce(undefined);
    await saveState();
    const saved = JSON.parse(mockInvoke.mock.calls[0][1].json);
    expect(saved.defaultPropagateSkipPermissions).toBe(false);
  });

  it('persists defaultPropagateSkipPermissions=true', async () => {
    setStore('defaultPropagateSkipPermissions', true);
    mockInvoke.mockResolvedValueOnce(undefined);
    await saveState();
    const saved = JSON.parse(mockInvoke.mock.calls[0][1].json);
    expect(saved.defaultPropagateSkipPermissions).toBe(true);
  });

  it.each([
    ['string', 'yes'],
    ['number', 1],
    ['null', null],
  ])(
    'falls back to the fork default (true) for non-boolean defaultPropagateSkipPermissions (%s)',
    async (_label, value) => {
      setStore('defaultPropagateSkipPermissions', false);
      mockInvoke.mockResolvedValueOnce(basePayload({ defaultPropagateSkipPermissions: value }));
      await loadState();
      expect(store.defaultPropagateSkipPermissions).toBe(true);
    },
  );
});

describe('showSteps → defaultStepsEnabled migration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setStore('defaultStepsEnabled', false);
  });

  it('migrates legacy showSteps=true to defaultStepsEnabled=true', async () => {
    mockInvoke.mockResolvedValueOnce(
      JSON.stringify({
        projects: [],
        taskOrder: [],
        collapsedTaskOrder: [],
        tasks: {},
        showSteps: true,
      }),
    );
    await loadState();
    expect(store.defaultStepsEnabled).toBe(true);
  });

  it('defaultStepsEnabled wins when both fields are present', async () => {
    // If a user saves with the new field but an old showSteps is also present
    // (e.g. partially migrated state), the explicit new field takes precedence.
    mockInvoke.mockResolvedValueOnce(
      JSON.stringify({
        projects: [],
        taskOrder: [],
        collapsedTaskOrder: [],
        tasks: {},
        showSteps: false,
        defaultStepsEnabled: true,
      }),
    );
    await loadState();
    expect(store.defaultStepsEnabled).toBe(true);
  });

  it('explicit defaultStepsEnabled=false is not overridden by showSteps=true', async () => {
    // This is the direction the old || logic got wrong — an explicit false was
    // overridden by a legacy true.  The new presence-check logic must respect
    // the explicit new field even when the legacy field disagrees.
    mockInvoke.mockResolvedValueOnce(
      JSON.stringify({
        projects: [],
        taskOrder: [],
        collapsedTaskOrder: [],
        tasks: {},
        showSteps: true,
        defaultStepsEnabled: false,
      }),
    );
    await loadState();
    expect(store.defaultStepsEnabled).toBe(false);
  });

  it('showSteps=false does not set defaultStepsEnabled=true', async () => {
    mockInvoke.mockResolvedValueOnce(
      JSON.stringify({
        projects: [],
        taskOrder: [],
        collapsedTaskOrder: [],
        tasks: {},
        showSteps: false,
      }),
    );
    await loadState();
    expect(store.defaultStepsEnabled).toBe(false);
  });

  it('showSteps is not saved by saveState', async () => {
    setStore('defaultStepsEnabled', true);
    mockInvoke.mockResolvedValueOnce(undefined);
    await saveState();
    const saved = JSON.parse(mockInvoke.mock.calls[0][1].json);
    expect(saved.showSteps).toBeUndefined();
    expect(saved.defaultStepsEnabled).toBe(true);
  });
});

// Fork direction: restoring the app must not respawn every persisted session with
// resume args — that re-enters each agent's previous conversation and can trigger
// automatic context compaction across all of them at once. Auto-resume is opt-in;
// live PTYs (renderer reload) always reattach because attaching spawns nothing.
describe('session auto-resume (fork)', () => {
  beforeEach(() => {
    setStore('autoResumeSessions', false);
  });

  function payloadWithTask(def: AgentDef, extra: Record<string, unknown> = {}): string {
    return JSON.stringify({
      projects: [{ id: 'project-1', name: 'Repo', path: '/repo', color: 'hsl(0, 70%, 75%)' }],
      lastProjectId: 'project-1',
      lastAgentId: null,
      taskOrder: ['task-1'],
      collapsedTaskOrder: [],
      tasks: { 'task-1': { ...persistedTask(def), agentIds: ['agent-live'] } },
      activeTaskId: 'task-1',
      sidebarVisible: true,
      ...extra,
    });
  }

  it('suspends restored agents by default instead of respawning with resume args', async () => {
    mockInvoke.mockResolvedValueOnce(payloadWithTask(agentDef()));
    await loadState();
    const agent = store.agents[store.tasks['task-1'].agentIds[0]];
    expect(agent.suspended).toBe(true);
    expect(agent.status).toBe('exited');
    expect(agent.signal).toBe('suspended');
    expect(store.autoResumeSessions).toBe(false);
  });

  it('auto-resumes restored agents when autoResumeSessions is opted in', async () => {
    mockInvoke.mockResolvedValueOnce(payloadWithTask(agentDef(), { autoResumeSessions: true }));
    await loadState();
    const agent = store.agents[store.tasks['task-1'].agentIds[0]];
    expect(agent.suspended).toBeUndefined();
    expect(agent.status).toBe('running');
    expect(store.autoResumeSessions).toBe(true);
  });

  it('reattaches agents whose PTY is still alive even without opt-in', async () => {
    mockInvoke
      .mockResolvedValueOnce(payloadWithTask(agentDef()))
      .mockResolvedValueOnce(['agent-live']);
    await loadState();
    const agent = store.agents['agent-live'];
    expect(agent.suspended).toBeUndefined();
    expect(agent.status).toBe('running');
    expect(agent.attachExisting).toBe(true);
  });

  it('does not persist autoResumeSessions=false; persists an explicit true', async () => {
    setStore('autoResumeSessions', false);
    mockInvoke.mockResolvedValueOnce(undefined);
    await saveState();
    let saved = JSON.parse(mockInvoke.mock.calls[0][1].json);
    expect(saved.autoResumeSessions).toBeUndefined();

    vi.clearAllMocks();
    setStore('autoResumeSessions', true);
    mockInvoke.mockResolvedValueOnce(undefined);
    await saveState();
    saved = JSON.parse(mockInvoke.mock.calls[0][1].json);
    expect(saved.autoResumeSessions).toBe(true);
  });
});

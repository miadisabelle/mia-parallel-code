import { describe, it, expect } from 'vitest';
import { store, setStore } from './core';
import { persistedSnapshot } from './autosave';

describe('autosave snapshot includes new-task-default fields', () => {
  it('defaultStepsEnabled changes the snapshot', () => {
    setStore('defaultStepsEnabled', false);
    const before = persistedSnapshot();
    setStore('defaultStepsEnabled', true);
    const after = persistedSnapshot();
    expect(before).not.toBe(after);
    setStore('defaultStepsEnabled', false);
  });

  it('defaultSkipPermissions changes the snapshot', () => {
    setStore('defaultSkipPermissions', false);
    const before = persistedSnapshot();
    setStore('defaultSkipPermissions', true);
    const after = persistedSnapshot();
    expect(before).not.toBe(after);
    setStore('defaultSkipPermissions', false);
  });

  it('defaultPropagateSkipPermissions changes the snapshot', () => {
    setStore('defaultPropagateSkipPermissions', false);
    const before = persistedSnapshot();
    setStore('defaultPropagateSkipPermissions', true);
    const after = persistedSnapshot();
    expect(before).not.toBe(after);
    setStore('defaultPropagateSkipPermissions', false);
  });

  it('showSteps is not tracked separately (migrated to defaultStepsEnabled)', () => {
    expect('showSteps' in store).toBe(false);
  });

  // A per-task skip-permissions flip must reach the debounced autosave, or the
  // change is silently dropped on the next launch.
  it('a task-level skipPermissions flip changes the snapshot', () => {
    const taskId = 'autosave-skip-perms-task';
    setStore('tasks', taskId, {
      id: taskId,
      name: 'T',
      projectId: 'p',
      agentIds: [],
      shellAgentIds: [],
      skipPermissions: false,
    } as never);
    setStore('taskOrder', (order) => [...order, taskId]);

    const before = persistedSnapshot();
    setStore('tasks', taskId, 'skipPermissions', true);
    const after = persistedSnapshot();
    expect(before).not.toBe(after);

    setStore('taskOrder', (order) => order.filter((id) => id !== taskId));
    setStore('tasks', taskId, undefined as never);
  });

  it('autoResumeSessions changes the snapshot', () => {
    setStore('autoResumeSessions', false);
    const before = persistedSnapshot();
    setStore('autoResumeSessions', true);
    const after = persistedSnapshot();
    expect(before).not.toBe(after);
    setStore('autoResumeSessions', false);
  });
});

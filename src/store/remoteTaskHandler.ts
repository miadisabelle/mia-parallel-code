// Handles task-creation requests from paired phones. The remote HTTP server
// (main process) forwards them here so we can run the renderer's normal
// createTask orchestration — the same path the desktop "New Task" dialog uses —
// and reply with the resulting task id. See electron/ipc/register.ts for the
// main-side bridge.

import { store } from './core';
import { createTask, updateTaskNotes } from './tasks';
import { invoke } from '../lib/ipc';
import { IPC } from '../../electron/ipc/channels';
import { resolveSkipPermissionsArgs } from '../../electron/ipc/agent-defaults';
import type { AgentDef } from '../ipc/types';

interface RendererRequest {
  reqId: string;
}

interface CreateTaskRequest extends RendererRequest {
  projectId: string;
  name: string;
  prompt: string;
}

interface GetNotesRequest extends RendererRequest {
  taskId: string;
}

interface SetNotesRequest extends RendererRequest {
  taskId: string;
  notes: string;
}

/**
 * Whether a task created from a phone launches its agent with skip-permissions.
 *
 * Mirrors the desktop New Task dialog: adopt the profile default, but only for
 * an agent that actually has a skip-permissions flag.  Without this the remote
 * path left skipPermissions undefined on every task it created, so a profile
 * with the flag defaulted ON still launched agents that prompt on every tool
 * call (#7) — the desktop dialog honoured the default and the phone did not.
 */
export function remoteTaskSkipPermissions(
  agentDef: Pick<AgentDef, 'command'> & Partial<Pick<AgentDef, 'skip_permissions_args'>>,
  defaultSkipPermissions: boolean,
): boolean {
  return defaultSkipPermissions && resolveSkipPermissionsArgs(agentDef).length > 0;
}

function reply(reqId: string, ok: boolean, data?: unknown, error?: string): void {
  // Fire-and-forget: main resolves/rejects the pending HTTP response by reqId.
  invoke(IPC.Remote_RendererReply, { reqId, ok, data, error }).catch(() => {});
}

function handleGetProjects(req: RendererRequest): void {
  reply(
    req.reqId,
    true,
    store.projects.map((p) => ({ id: p.id, name: p.name })),
  );
}

async function handleCreateTask(req: CreateTaskRequest): Promise<void> {
  try {
    const project = store.projects.find((p) => p.id === req.projectId);
    if (!project) throw new Error('Project not found');

    // Default agent: the last one used, else the first available (mirrors the
    // New Task dialog's initial selection).
    const agentDef =
      store.availableAgents.find((a) => a.id === store.lastAgentId) ?? store.availableAgents[0];
    if (!agentDef) throw new Error('No agent configured');

    // Non-git projects can't use worktree isolation; fall back to working
    // directly in the project folder.
    const isGit = project.isGitRepo !== false;
    let baseBranch = '';
    let symlinkDirs: string[] = [];
    if (isGit) {
      baseBranch =
        project.defaultBaseBranch ??
        (await invoke<string>(IPC.GetMainBranch, { projectRoot: project.path }));
      // Match the desktop New Task default: symlink all gitignored dirs (e.g.
      // node_modules) into the worktree so the agent has a working environment.
      symlinkDirs = await invoke<string[]>(IPC.GetGitignoredDirs, { projectRoot: project.path });
    }

    const taskId = await createTask({
      name: req.name,
      agentDef,
      projectId: req.projectId,
      gitIsolation: isGit ? 'worktree' : 'none',
      baseBranch,
      symlinkDirs,
      initialPrompt: req.prompt,
      skipPermissions: remoteTaskSkipPermissions(agentDef, store.defaultSkipPermissions),
      // A task created from a phone must not move the desktop's selection: the
      // person at the desktop may be mid-sentence in another column, and the
      // jump would scroll the strip and re-target keyboard focus under them.
      // With no task active there is nothing to protect, so the store still
      // adopts it (see initTaskInStore).
      activate: false,
    });
    reply(req.reqId, true, { taskId });
  } catch (err) {
    reply(req.reqId, false, undefined, err instanceof Error ? err.message : String(err));
  }
}

/**
 * True only when `taskId` is a real, own entry of the tasks record.
 *
 * Uses Object.hasOwn, NOT truthiness: `taskId` arrives from a mobile HTTP
 * request, and Solid's store proxy resolves inherited keys (`__proto__`,
 * `constructor`, `toString`, …) to prototype objects, which are truthy but are
 * not tasks. A truthiness guard would let updateTaskNotes → setStore('tasks',
 * '__proto__', 'notes', …) pollute Object.prototype. hasOwn reports only own
 * properties, so it rejects every inherited/dangerous/missing key.
 */
export function isKnownTask(tasks: Record<string, unknown>, taskId: string): boolean {
  return Object.hasOwn(tasks, taskId);
}

function handleGetNotes(req: GetNotesRequest): void {
  if (!isKnownTask(store.tasks, req.taskId)) {
    reply(req.reqId, false, undefined, 'Task not found');
    return;
  }
  reply(req.reqId, true, { notes: store.tasks[req.taskId].notes ?? '' });
}

function handleSetNotes(req: SetNotesRequest): void {
  if (!isKnownTask(store.tasks, req.taskId)) {
    reply(req.reqId, false, undefined, 'Task not found');
    return;
  }
  updateTaskNotes(req.taskId, req.notes);
  reply(req.reqId, true, { ok: true });
}

/** Subscribe to mobile task-creation requests. Returns an unsubscribe fn. */
export function startRemoteTaskHandlers(): () => void {
  const offProjects = window.electron.ipcRenderer.on(
    IPC.Remote_GetProjectsRequest,
    (data: unknown) => {
      if (data && typeof data === 'object') handleGetProjects(data as RendererRequest);
    },
  );
  const offCreate = window.electron.ipcRenderer.on(
    IPC.Remote_CreateTaskRequest,
    (data: unknown) => {
      if (data && typeof data === 'object') void handleCreateTask(data as CreateTaskRequest);
    },
  );
  const offGetNotes = window.electron.ipcRenderer.on(
    IPC.Remote_GetNotesRequest,
    (data: unknown) => {
      if (data && typeof data === 'object') handleGetNotes(data as GetNotesRequest);
    },
  );
  const offSetNotes = window.electron.ipcRenderer.on(
    IPC.Remote_SetNotesRequest,
    (data: unknown) => {
      if (data && typeof data === 'object') handleSetNotes(data as SetNotesRequest);
    },
  );
  return () => {
    offProjects();
    offCreate();
    offGetNotes();
    offSetNotes();
  };
}

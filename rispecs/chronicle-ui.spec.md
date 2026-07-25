# Chronicle Awareness in the Desktop UI

What this enables: episodes, decompositions, and structural-tension state become visible where the work happens — a badge on the project, a tab beside Notes, a chart beside Steps — so the desktop reads as part of the chronicle it feeds.

## Desired Outcome Definition

A project bound to `miadi-chronicle://103/...` shows its episode badge in the sidebar; opening a task offers a Chronicle tab listing that episode's beats (including ones this desktop emitted); a task with an STC chart shows its structural tension beside the terminal. Configuration lives in one Settings tab. (Fulfils fork issue #5 / spec jgwill/Miadi#543.)

## Current Reality

- Zero chronicle/miadi references in `src/` today; the A11 design lives in `foundations/tide-parallel-code-bridge/bridge-design.md:180-209` (episode field on Project, badge in Sidebar, `electron/ipc/weave.ts`).
- Proven UI patterns, mapped: per-task panels are `PanelChild` entries (`TaskPanel.tsx:361-430`, 5-step toggle chain); Notes↔Plan tabs via `notesTab` signal (`TaskNotesBody.tsx:23`); Settings tabs union at `SettingsDialog.tsx:58`; project rows at `Sidebar.tsx:608-693`; async remote lists via `BranchCombobox` shape; fullscreen readers via `PlanViewerDialog`; external content arrives by main-process push, not component fetch (`App.tsx:532`, `plans.ts` watcher).
- Miadi read surfaces (integration-ready): `GET /api/chronicle/resolve?uri=` (deterministic, tested, degrades to data), `GET /api/stc/charts|files|workspaces`, `GET /api/lattice/[key]` + `/api/lattices` (bearer reader), `GET /api/pde/[uuid]`/`review`.
- `Project` type has no episode field yet (`types.ts:65-78`).

## Structural Tension

The desktop already emits narrative events (see `task-lifecycle-events.spec.md`) it cannot yet see; a read surface beside the work completes the circuit and makes the episode binding worth maintaining.

## Screens

### Sidebar — Episode Badge

- **Behavior:** project rows with an `episode` binding render a small badge (episode number, colored by reachability of `chronicle/resolve`). Click → popover: episode title, path, "open in Miadi" (external browser via `openExternalHttpUrl`), rebind field.
- **Layout:** inside the project row (`Sidebar.tsx:608-693`), after the name; pattern of `TaskBranchInfoBar` chips.
- **Data:** `Project.episode?: { uri: string; label?: string }`; persisted with projects; resolution cached in main (new `electron/ipc/weave.ts`, per A11).

### Task — Chronicle tab

- **Behavior:** third tab in the Notes/Plan bar (`notesTab` union gains `'chronicle'`). Shows: episode beats for the bound episode (desktop-emitted events highlighted via `source:'parallel-code'` + traceId match), the task's PDE record link when `task.pdeId` exists. Refresh on `IPC.MiadiUpdate` push — main polls, renderer renders (pr-checks watcher shape: `pr-checks.ts:88/:159/:305`).
- **Styling:** timeline list reusing `TaskStepsSection`'s status-dot + relative-time idiom (`TaskStepsSection.tsx:11-59`).
- **Gate:** `store.showChronicle` via the 5-step chain; hidden entirely when the Miadi lane is off.

### Task — STC panel (second iteration)

- **Behavior:** when the project maps to an STC workspace (`stc/workspaces?repository=`), a `PanelChild` (`stc-section`) renders the chart's desired outcome / current reality / action steps read from `stc/charts?repository=&full=`; observations this desktop contributed are marked.
- **Layout:** beside Steps (`TaskPanel.tsx:361` sibling, `maxAutoSize` constant like `STEPS_PANEL_AUTO_MAX`).

### Settings — Miadi tab

- **Behavior:** fourth `SettingsTab` value `'miadi'` (`SettingsDialog.tsx:58`, both literal arrays, label branch). Sections: Connection (base URL, token — token via main-process IPC like `setMinimaxApiKey`, never `state.json`), Lanes (events, session registration, PDE, chronicle UI — independent toggles, all default off), Status (health pill: `GET /api/health` mode/version, pattern `ConnectPhoneModal.tsx:277`).

## Components

### `EpisodeBadge`

- **Behavior:** resolves through main-cached `chronicle/resolve`; `resolved:false` renders as a hollow badge (a broken reference is data, not an error — matching the API's own philosophy).

### `ChronicleTimeline`

- **Behavior:** renders beats newest-first; a beat whose traceId matches a live task deep-links to that task column (`setActiveTask`).

## Creative Advancement Scenario: Seeing the Episode From the Bench

**User Intent**: while working episode 103, see the episode's story grow from inside the desktop.
**Current Reality**: episode lives in `/srv/miadi/episodes/...`; the desktop shows terminals.
**Natural Progression**:

1. Bind the project to `miadi-chronicle://103` in the badge popover
2. Work normally; landings emit beats (lifecycle spec); Chronicle tab accrues them
3. A beat from another vessel (phone, herdr lane) appears — the episode is shared ground
   **Achieved Outcome**: the desktop is a window into the episode, not just a producer of it.
   **Supporting Features**: episode binding, main-process poller, timeline tab, resolve caching.

## Data

`Project.episode?: {uri, label?}` · `store.showChronicle: boolean` · `store.miadiConfig` (main-held secret + renderer-safe `{baseUrl, lanes, healthy}`) · `IPC.MiadiUpdate` push channel (triple-edit rule applies).

## Exportation

Order: Settings tab + health pill → episode badge (A11's three-file change) → Chronicle tab → STC panel. Each step visible on its own; all behind lane toggles for clean upstream cherry-picks.

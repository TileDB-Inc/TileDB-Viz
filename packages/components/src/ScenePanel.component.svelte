<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import Select from './misc/Select.component.svelte';
  import { Events } from './constants/events';
  import { GUIEvent, ScenePanelInitializationEvent } from '@tiledb-inc/viz-common';
  import { GUIPropertyState } from './types';
  import { setupProperties } from './utils/helpers';

  let globalState: GUIPropertyState<any>[] = [];

  function onInitialize(
    event: CustomEvent<GUIEvent<ScenePanelInitializationEvent>>
  ) {
    if (event.detail.target !== 'scene-panel') {
      return;
    }

    event.stopPropagation();
    globalState = setupProperties(event.detail.props.properties);
  }

  onMount(() => {
    window.addEventListener(Events.INITIALIZE, onInitialize, {
      capture: true
    });
  });

  onDestroy(() => {
    window.removeEventListener(Events.INITIALIZE, onInitialize, {
      capture: true
    });
  });
</script>

<div class="Viewer-ScenePanel">
  <div class="Viewer-ScenePanel__header">Scene Settings</div>
  <div class="Viewer-ScenePanel__main">
    {#each globalState as state}
      {#if state.property.type === 'SELECT'}
        <Select
          {state}
          dataset={'scene'}
        />
      {/if}
    {/each}
  </div>
</div>

<style lang="scss">
  .Viewer-ScenePanel {
    background: var(--viewer-surface-primary);
    display: flex;
    flex-direction: column;
    font-size: 14px;
    font-family: Inter, Arial, 'sans-serif';
    color: var(--viewer-text-primary);
    fill: var(--viewer-text-primary);
    gap: 12px;

    &__header {
      border-bottom: 1px solid var(--viewer-border);
      vertical-align: middle;
      line-height: 28px;
      padding: 6px 20px;
      font-weight: 600;
      font-size: 14px;
      display: flex;
      justify-content: space-between;
    }

    &__main {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
  }
</style>

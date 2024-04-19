<script lang="ts">
  import Select from './misc/Select.component.svelte';
  import VectorInput from './misc/VectorInput.component.svelte';
  import { Events } from './constants/events';
  import { GUIPropertyState, GUISelectPropertyState, GUIVectorPropertyState } from './types';
  import { GUIEvent, CameraPanelInitializationEvent, GUISelectProperty, EngineUpdate } from '@tiledb-inc/viz-common';
  import { onDestroy, onMount } from 'svelte';

  let globalState: {
    position: GUIVectorPropertyState;
    target: GUIVectorPropertyState;
    projection: GUISelectPropertyState;
  };

  function onInitialize(event: CustomEvent<GUIEvent<CameraPanelInitializationEvent>>) {
    if (event.detail.target !== 'camera-panel') {
      return;
    }

    event.stopPropagation();
    const payload = event.detail.props;

    globalState = {
      projection: { property: payload.projection, value: payload.projection.default },
      position: { property: payload.position, value: JSON.parse(JSON.stringify(payload.position.value)) },
      target: { property: payload.target, value: JSON.parse(JSON.stringify(payload.target.value)) }
    }
  }

  function onEngineUpdate(event: CustomEvent<GUIEvent<EngineUpdate[]>>) {
    if (event.detail.target !== 'camera-panel' && event.detail.target !== '') {
      return;
    }

    if (event.detail.target === 'camera-panel') {
      event.stopPropagation();
    }
    for (const payload of event.detail.props) {
      switch (payload.propertyID) {
        case globalState.position.property.id:
          globalState.position.value = payload.value;
          break;
        case globalState.target.property.id:
          globalState.target.value = payload.value;
          break;
      }
    }
  }

  onMount(() => {
    window.addEventListener(Events.INITIALIZE, onInitialize, {
      capture: true
    });

    window.addEventListener(Events.ENGINE_INFO_UPDATE, onEngineUpdate, {
      capture: true
    });
  });

  onDestroy(() => {
    window.removeEventListener(Events.INITIALIZE, onInitialize, {
      capture: true
    });

    window.removeEventListener(Events.ENGINE_INFO_UPDATE, onEngineUpdate, {
      capture: true
    });
  });
</script>

<div class="Viewer-CameraPanel">
  <div class="Viewer-CameraPanel__header">Camera Settings</div>
  <div class="Viewer-CameraPanel__main">
    {#if globalState === undefined}
      No camera found
    {:else}
      <Select state={globalState.projection}></Select>
      <VectorInput state={globalState.position}></VectorInput>
      <VectorInput state={globalState.target}></VectorInput>
    {/if}
  </div>
</div>

<style lang="scss">
  .Viewer-CameraPanel {
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

<script lang="ts">
  import Select from './misc/Select.component.svelte';
  import Slider from './misc/InlineSlider.component.svelte';
  import VectorInput from './misc/VectorInput.component.svelte';
  import { Events } from './constants/events';
  import { GUIPropertyState, GUISelectPropertyState, GUISliderPropertyState, GUIVectorPropertyState } from './types';
  import { GUIEvent, CameraPanelInitializationEvent, GUISelectProperty, EngineUpdate } from '@tiledb-inc/viz-common';
  import { onDestroy, onMount } from 'svelte';
    import ZoomControl from './ZoomControl.component.svelte';

  let globalState: {
    position: GUIVectorPropertyState;
    target: GUIVectorPropertyState;
    projection: GUISelectPropertyState;
    rotation: GUISliderPropertyState;
    pitch: GUISliderPropertyState;
    zoom: GUISliderPropertyState;
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
      target: { property: payload.target, value: JSON.parse(JSON.stringify(payload.target.value)) },
      rotation: { property: payload.rotation, value: payload.rotation.default },
      pitch: { property: payload.pitch, value: payload.pitch.default },
      zoom: { property: payload.zoom, value: payload.zoom.default }
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
        case globalState.rotation.property.id:
          globalState.rotation.value = payload.value;
          break;
        case globalState.pitch.property.id:
          globalState.pitch.value = payload.value;
          break;
        case globalState.zoom.property.id:
          globalState.zoom.value = payload.value;
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
      <ZoomControl state={globalState.zoom} />
      <Select state={globalState.projection} />
      <VectorInput state={globalState.position} />
      <VectorInput state={globalState.target} />
      <Slider state={globalState.rotation} dataset={'camera'} formatter={val => val.toFixed(1) + '\xB0'} />
      <Slider state={globalState.pitch} dataset={'camera'} formatter={val => val.toFixed(1) + '\xB0'} />
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

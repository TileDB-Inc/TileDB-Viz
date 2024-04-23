<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import Select from './misc/Select.component.svelte';
  import { Events } from './constants/events';
  import { GUIEvent, TilePanelInitializationEvent } from '@tiledb-inc/viz-common';
  import { GUIPropertyState, GUISelectPropertyState, GUISliderPropertyState } from './types';
  import { setupProperties } from './utils/helpers';
  import Slider from './misc/InlineSlider.component.svelte';

  let datasetPropertyState: GUISelectPropertyState = {
      property: {
      name: 'Dataset',
      id: 'dataset',
      entries: [],
      default: 0
    },
    value: 0
  };
  let globalState: { 
    datasetID: string;  
    sourceCRS: GUISelectPropertyState;
    sseThreshold: GUISliderPropertyState;
    opacity: GUISliderPropertyState;
  }[] = [];

  function datasetOnChange(value: number) {
    datasetPropertyState.value = value;
  }

  function onInitialize(
    event: CustomEvent<GUIEvent<TilePanelInitializationEvent>>
  ) {
    if (event.detail.target !== 'tile-panel') {
      return;
    }

    event.stopPropagation();
    const payload = event.detail.props;

    globalState.push({
        datasetID: payload.id,
        sourceCRS: {property: payload.sourceCRS, value: payload.sourceCRS.default},
        sseThreshold: {property: payload.sseThreshold, value: payload.sseThreshold.default},
        opacity: {property: payload.opacity, value: payload.opacity.default}
      }
    );

    datasetPropertyState.property.entries.push({value: datasetPropertyState.property.entries.length, name: event.detail.props.name});
    datasetPropertyState = {...datasetPropertyState};
  }

  $: currentState = globalState[datasetPropertyState.value]

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
    {#if datasetPropertyState.property.entries.length === 0}
      No 3D Tile assets found
    {:else}
      <Select state={datasetPropertyState} callback={(value) => datasetPropertyState.value = value} />
      <Select state={currentState.sourceCRS} dataset={currentState.datasetID} />
      <Slider state={currentState.sseThreshold} dataset={currentState.datasetID} />
      <Slider state={currentState.opacity} dataset={currentState.datasetID} />
    {/if}
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

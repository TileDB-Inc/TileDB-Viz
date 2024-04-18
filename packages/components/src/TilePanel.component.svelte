<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import Select from './misc/Select.component.svelte';
  import { Events } from './constants/events';
  import { GUIEvent, TilePanelInitializationEvent } from '@tiledb-inc/viz-common';
  import { GUIPropertyState, GUISelectPropertyState } from './types';
  import { setupProperties } from './utils/helpers';
  import Slider from './misc/InlineSlider.component.svelte';

  let datasetPropertyState: GUISelectPropertyState = {
      property: {
      type: 'SELECT',
      name: 'Dataset',
      id: 'dataset',
      values: [] as string[],
      default: 0
    },
    value: 0
  };
  let globalState: Array<{ dataset: string; state: GUIPropertyState<any>[] }> = [];

  function datasetOnChange(value: number) {
    datasetPropertyState.value = value;
  }

  function onInitialize(
    event: CustomEvent<GUIEvent<TilePanelInitializationEvent>>
  ) {
    console.log(event);
    if (event.detail.target !== 'tile-panel') {
      return;
    }

    event.stopPropagation();
    globalState.push(
      {
        dataset: event.detail.props.id,
        state: setupProperties(event.detail.props.properties)
      }
    );

    datasetPropertyState.property.values.push(event.detail.props.name);
    datasetPropertyState = {...datasetPropertyState};
  }

  $: currentDataset = globalState[datasetPropertyState.value]?.dataset;

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
    <Select dataset={''} state={datasetPropertyState} callback={datasetOnChange} />
    {#each globalState[datasetPropertyState.value]?.state ?? [] as state}
      {#if state.property.type === 'SELECT'}
        <Select {state} dataset={currentDataset} />
      {:else if state.property.type === 'SLIDER'}
        <Slider {state} dataset={currentDataset} />
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

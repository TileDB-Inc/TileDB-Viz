<script lang="ts">
  import Select from './misc/Select.component.svelte';
  import Slider from './misc/InlineSlider.component.svelte';
  import FlatColorPanel from './misc/FlatColorPanel.component.svelte';
  import CategoricalPanel from './misc/CategoricalPanel.component.svelte';
  import {
    GUICategoricalState,
    GUIEvent,
    GUIFeaturePropertyState,
    GUIFlatColorState,
    GUIPropertyState,
    GUISelectPropertyState,
    GUISliderPropertyState,
    SelectProps,
    SliderProps,
    colorScheme
  } from './types';
  import { Events } from './constants/events';
  import { clone, createFeatureState } from './utils/helpers';
  import {
    FeatureType,
    GUICategoricalFeature,
    GUIFeatureProperty,
    GUIFlatColorFeature,
    GUISelectProperty,
    GUISliderProperty,
    PointPanelInitializationEvent,

    PointShape

  } from '@tiledb-inc/viz-common';
  import { onDestroy, onMount } from 'svelte';

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
    pointBudget: GUISliderPropertyState;
    quality: GUISliderPropertyState;
    pointShape: GUISelectPropertyState<PointShape>;
    pointSize: GUISliderPropertyState;
    pointOpacity: GUISliderPropertyState;
    displayFeature: GUIFeaturePropertyState;
  }[] = [];

  $: currentDataset = globalState[datasetPropertyState.value]?.datasetID;
  $: currentFeature = globalState[datasetPropertyState.value]?.displayFeature;

  function onInitialize(
    event: CustomEvent<GUIEvent<PointPanelInitializationEvent>>
  ) {
    if (event.detail.target !== 'point-panel') {
      return;
    }

    event.stopPropagation();
    const payload = event.detail.props;

    globalState.push({
      datasetID: event.detail.props.id,
      pointBudget: {property: payload.pointBudget, value: payload.pointBudget.default},
      quality: {property: payload.quality, value: payload.quality.default},
      pointShape: {property: payload.pointShape, value: payload.pointShape.default},
      pointSize: {property: payload.pointSize, value: payload.pointSize.default},
      pointOpacity: {property: payload.pointOpacity, value: payload.pointOpacity.default},
      displayFeature: createFeatureState(payload.displayFeature, payload.enumerations)
    });

    datasetPropertyState.property.entries.push({value: datasetPropertyState.property.entries.length, name: event.detail.props.name});
    datasetPropertyState = { ...datasetPropertyState };
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

<div class="Viewer-PointCloud">
  <div class="Viewer-PointCloud__header">
    <svg
      width="24"
      height="24"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M24 4.01001C24.6562 4.01001 25.2706 4.33177 25.6443 4.87153L43.6444 30.8713C43.9658 31.3357 44.076 31.9139 43.9477 32.464C43.8198 33.0138 43.4649 33.4839 42.9714 33.7582L24.9713 43.7585C24.3673 44.094 23.6327 44.094 23.0287 43.7585L5.02865 33.7582C4.53512 33.4839 4.18055 33.0138 4.05228 32.464C3.92404 31.9139 4.0342 31.3357 4.35563 30.8713L22.3557 4.87153C22.7293 4.33179 23.3437 4.01001 24 4.01001ZM8.90053 31.3332L21.9994 38.6105V12.4119L8.90053 31.3332ZM25.9997 12.4117V38.6104L39.0986 31.333L25.9997 12.4117Z"
        fill="var(--viewer-text-disabled)"
      />
    </svg>
    Point Cloud
  </div>
  <div class="Viewer-PointCloud_main">
    {#if datasetPropertyState.property.entries.length === 0}
      No point cloud asset found
    {:else}
      <Select state={datasetPropertyState} dataset={''} callback={(index) => datasetPropertyState.value = index}/>
      <Slider state={globalState[datasetPropertyState.value].pointBudget} dataset={currentDataset}/>
      <Slider state={globalState[datasetPropertyState.value].quality} dataset={currentDataset}/>
      <Select state={globalState[datasetPropertyState.value].pointShape} dataset={currentDataset}/>
      <Slider state={globalState[datasetPropertyState.value].pointSize} dataset={currentDataset}/>
      <Slider state={globalState[datasetPropertyState.value].pointOpacity} dataset={currentDataset}/>

      {#if currentFeature.property.entries.length === 0}
        No Available Features
      {:else}
        <Select
          state={globalState[datasetPropertyState.value].displayFeature}
          dataset={currentDataset}
          callback={(index) => currentFeature.value = index}
        />
        {#if currentFeature.property.features[currentFeature.value].type === FeatureType.FLAT_COLOR}
          <FlatColorPanel
            state={currentFeature.flatColorState[currentFeature.property.features[currentFeature.value].name]}
            dataset={globalState[datasetPropertyState.value].datasetID}
          />
        {:else if currentFeature.property.features[currentFeature.value].type === FeatureType.CATEGORICAL}
          <CategoricalPanel
            state={currentFeature.categoricalState[currentFeature.property.features[currentFeature.value].name]}
            dataset={globalState[datasetPropertyState.value].datasetID}
          />
        {/if}
      {/if}
    {/if}
  </div>
</div>

<style lang="scss">
  .Viewer-PointCloud {
    max-height: 600px;
    background-color: var(--viewer-background-primary);
    font-size: 14px;
    color: var(--viewer-text-primary);
    font-family: Inter, Arial, 'sans-serif';

    &__header {
      border-bottom: 1px solid var(--viewer-border);
      vertical-align: middle;
      line-height: 28px;
      padding: 6px 20px;
      font-weight: 600;
      font-size: 14px;
      display: flex;

      svg {
        margin-right: 10px;
      }
    }

    &_main {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
  }
</style>

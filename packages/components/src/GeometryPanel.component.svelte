<svelte:options
  customElement={{
    tag: 'geometry-panel'
  }}
/>

<script lang="ts">
  import Select from './misc/Select.component.svelte';
  import RenderingSettings from './geometry/Settings.component.svelte';
  import CategoricalPanel from './misc/CategoricalPanel.component.svelte';
  import FlatColorPanel from './misc/FlatColorPanel.component.svelte';
  import { GUIEvent, GUIFeaturePropertyState, GUISelectPropertyState, GUISliderPropertyState, SelectProps, colorScheme } from './types';
  import { Events } from './constants/events';
  import { createFeatureState } from './utils/helpers';
  import { FeatureType, GeometryPanelInitializationEvent, GeometryStyle } from '@tiledb-inc/viz-common';
  import { onDestroy, onMount } from 'svelte';
  import Slider from './misc/InlineSlider.component.svelte';


  // function geometryStyleOnChange(style: number) {
  //   state.options[state.selectedDataset].renderStyle = style;
  //   state = state;

  //   window.dispatchEvent(
  //     new CustomEvent<GUIEvent<SelectProps>>(Events.SELECT_INPUT_CHANGE, {
  //       bubbles: true,
  //       detail: {
  //         target: `${targets[state.selectedDataset][0]}_style`,
  //         props: {
  //           value: state.options[state.selectedDataset].renderStyle
  //         }
  //       }
  //     })
  //   );
  // }

  // function featureOnChange(index: number) {
  //   state.options[state.selectedDataset].selectedFeature = index;
  //   state = state;

  //   window.dispatchEvent(
  //     new CustomEvent<GUIEvent<SelectProps>>(Events.SELECT_INPUT_CHANGE, {
  //       bubbles: true,
  //       detail: {
  //         target: `${targets[state.selectedDataset][0]}_feature`,
  //         props: {
  //           value: state.options[state.selectedDataset].selectedFeature
  //         }
  //       }
  //     })
  //   );
  // }

  // function renderingGroupOnChange(renderingGroup: number) {
  //   state.options[state.selectedDataset].renderingGroup = renderingGroup;
  //   state = state;

  //   window.dispatchEvent(
  //     new CustomEvent<GUIEvent<SelectProps>>(Events.SELECT_INPUT_CHANGE, {
  //       bubbles: true,
  //       detail: {
  //         target: `${targets[state.selectedDataset][0]}_renderingGroup`,
  //         props: {
  //           value: state.options[state.selectedDataset].renderingGroup
  //         }
  //       }
  //     })
  //   );
  // }

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
    renderingGroup: GUISelectPropertyState;
    renderingStyle: GUISelectPropertyState<GeometryStyle>;
    fillOpacity: GUISliderPropertyState;
    outlineWidth: GUISliderPropertyState;
    displayFeature: GUIFeaturePropertyState;
  }[] = [];

  function onDatasetChange(index: number) {
    datasetPropertyState.value = index;
  }

  function onInitialize(event: CustomEvent<GUIEvent<GeometryPanelInitializationEvent>>) {
    if (event.detail.target !== 'geometry-panel') {
      return;
    }

    event.stopPropagation();
    const payload = event.detail.props;

    globalState.push({
      datasetID: event.detail.props.id,
      renderingGroup: {property: payload.renderingGroup, value: payload.renderingGroup.default},
      renderingStyle: {property: payload.renderingStyle, value: payload.renderingStyle.default},
      fillOpacity: {property: payload.fillOpacity, value: payload.fillOpacity.default},
      outlineWidth: {property: payload.outlineWidth, value: payload.outlineWidth.default},
      displayFeature: createFeatureState(payload.displayFeature, payload.enumerations)
    });

    datasetPropertyState.property.entries.push({value: datasetPropertyState.property.entries.length ,name: event.detail.props.name});
    datasetPropertyState = { ...datasetPropertyState };
  }

  $: currentFeature = globalState[datasetPropertyState.value]?.displayFeature;
  $: currentState = globalState[datasetPropertyState.value];

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

<div class="Viewer-Geometry">
  <div class="Viewer-Geometry__header">
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
        d="M46.3289 24.6851L29.2878 41.7261C29.1234 41.8906 28.9589 41.9453 28.7398 41.9453L19.6441 42C19.4249 42 19.2057 41.8903 19.096 41.7808L1.67123 24.3561C1.39735 24.0272 1.39735 23.5888 1.67123 23.2602L18.7123 6.21917C18.8767 6.10942 19.0412 6 19.2604 6H28.356C28.5752 6 28.7944 6.10974 28.9041 6.21917L46.3289 23.6439C46.6028 23.9178 46.6028 24.4112 46.3289 24.6851ZM25.9454 8.46618H21.6715L23.8085 10.5484L25.9454 8.46618ZM25.8907 35.6985L28.9044 38.7122L42.2193 25.3972H36.1919L25.8907 35.6985ZM25.5618 12.3017L36.1924 22.9322H42.2197L28.5211 9.28831L25.5618 12.3017ZM14.0006 23.8083L24.1927 33.9449L34.0011 24.1911L23.809 13.999L14.0006 23.8074V23.8083ZM5.78154 22.6027H11.8089L22.1104 12.3011L19.0968 9.28749L5.78154 22.6027ZM22.0551 39.5343H26.3291L24.1921 37.3973L22.0551 39.5343ZM22.4388 35.6987L11.8082 25.0134H5.78087L19.4795 38.7121L22.4388 35.6987Z"
        fill="var(--viewer-text-disabled)"
      />
    </svg>
    Geometry
  </div>
  <div class="Viewer-Geometry_main">
    {#if datasetPropertyState.property.entries.length === 0}
      No geometry assets found
    {:else}
      <Select
        state={datasetPropertyState}
        callback={onDatasetChange}
      />
      <Select
        state={globalState[datasetPropertyState.value].renderingGroup}
        dataset={globalState[datasetPropertyState.value].datasetID}
      />
      <Select 
        state={globalState[datasetPropertyState.value].renderingStyle} 
        callback={(value) => globalState[datasetPropertyState.value].renderingStyle.value = value}
        dataset={globalState[datasetPropertyState.value].datasetID} 
      />
      {#if currentState.renderingStyle.value == GeometryStyle.FILLED || currentState.renderingStyle.value == GeometryStyle.FILLED_OUTLINED}
        <Slider state={currentState.fillOpacity} dataset={currentState.datasetID} />
      {/if}
      {#if currentState.renderingStyle.value == GeometryStyle.OUTLINED || currentState.renderingStyle.value == GeometryStyle.FILLED_OUTLINED}
        <Slider state={currentState.outlineWidth} dataset={currentState.datasetID} />
      {/if}

      {#if currentFeature.property.entries.length === 0}
        No Available Features
      {:else}
        <Select
          state={globalState[datasetPropertyState.value].displayFeature} 
          dataset={currentState.datasetID}
          callback={index => currentFeature.value = index}
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
  .Viewer-Geometry {
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

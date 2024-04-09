<svelte:options
  customElement={{
    tag: 'point-panel',
    props: {
      features: { type: 'Array' },
      categories: { type: 'Array' },
      attributes: { type: 'Array' },
      targets: { type: 'Array' }
    }
  }}
/>

<script lang="ts">
  import Section from './Section.component.svelte';
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
  import { clone } from './utils/helpers';
  import {
    Attribute,
    Feature,
    FeatureType,
    GUICategoricalFeature,
    GUIFeatureProperty,
    GUIFlatColorFeature,
    GUISelectProperty,
    GUISliderProperty,
    PointPanelInitializationEvent
  } from '@tiledb-inc/viz-common';
  import { onDestroy, onMount } from 'svelte';

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
  let selectedDataset: string = '';

  function datasetOnChange(value: number) {
    datasetPropertyState.value = value;
  }

  function selectOnChange(value: number, dataset: string, property: string) {
    window.dispatchEvent(
      new CustomEvent<GUIEvent<SelectProps>>(Events.SELECT_INPUT_CHANGE, {
        bubbles: true,
        detail: {
          target: `${dataset}_${property}`,
          props: {
            value: value
          }
        }
      })
    );
  }

  function sliderOnChange(value: number, dataset: string, property: string) {
    window.dispatchEvent(
      new CustomEvent<GUIEvent<SliderProps>>(Events.SLIDER_CHANGE, {
        bubbles: true,
        detail: {
          target: `${dataset}_${property}`,
          props: {
            value: value
          }
        }
      })
    );
  }

  function featureOnChange(value: number, dataset: string, property: string) {
    globalState = {...globalState};

    window.dispatchEvent(
      new CustomEvent<GUIEvent<SelectProps>>(Events.SELECT_INPUT_CHANGE, {
        bubbles: true,
        detail: {
          target: `${dataset}_${property}`,
          props: {
            value: value
          }
        }
      })
    );
  }


  $: currentDataset = globalState[datasetPropertyState.value]?.dataset ;

  function onInitialize(
    event: CustomEvent<GUIEvent<PointPanelInitializationEvent>>
  ) {
    if (event.detail.target !== 'point-panel') {
      return;
    }

    event.stopPropagation();
    const state: GUIPropertyState<any>[] = [];

    for (const property of event.detail.props.properties) {
      switch (property.type) {
        case 'SLIDER':
          state.push({
              property: property,
              value: (property as GUISliderProperty).default
            } as GUISliderPropertyState
          );
          break;
        case 'SELECT':
          state.push({
              property: property,
              value: (property as GUISelectProperty).default
            } as GUISelectPropertyState
          );
          break;
        case 'FEATURE': {
          const colorState: Record<string, GUIFlatColorState> = {};
          const categoryState: Record<string, GUICategoricalState> = {};

          for (const feature of (property as GUIFeatureProperty).features) {
            if (feature.type === FeatureType.FLAT_COLOR) {
              colorState[feature.name] = {
                fill: (feature as GUIFlatColorFeature).fill,
                outline: (feature as GUIFlatColorFeature).outline
              } as GUIFlatColorState;
            } else if (feature.type === FeatureType.CATEGORICAL) {
              categoryState[feature.name] = {
                colors: clone(colorScheme),
                category: Object.fromEntries(
                  event.detail.props.enumerations[
                    (feature as GUICategoricalFeature).enumeration
                  ].map(x => {
                    return [x, { group: 0, selected: false }];
                  })
                )
              } as GUICategoricalState;
            }
          }
          state.push({
              property: property,
              flatColorState: colorState,
              categoricalState: categoryState,
              value: 0
            } as GUIFeaturePropertyState);
          break;
        }
      }
    }
    globalState.push(
      {
        dataset: event.detail.props.id,
        state: state
      }
    );

    datasetPropertyState.property.values.push(event.detail.props.name);
    datasetPropertyState = {...datasetPropertyState};
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

<Section>
  <div slot="header" class="Viewer-PointCloud__title">
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
  <div class="Viewer-PointCloud_main" slot="content">
    <Select dataset={''} state={datasetPropertyState} callback={datasetOnChange} />

    {#each globalState[datasetPropertyState.value]?.state ?? [] as state}
      {#if state.property.type === 'SELECT'}
        <Select
          {state}
          dataset={currentDataset}
          callback={selectOnChange}
        />
      {:else if state.property.type === 'SLIDER'}
        <Slider
          {state}
          dataset={currentDataset}
          callback={sliderOnChange}
        />
      {:else if state.property.type === 'FEATURE'}
        <Select
          {state}
          dataset={currentDataset}
          callback={featureOnChange}
        />
        {console.log(state)}
        {#if state.property.features[state.value].type === FeatureType.FLAT_COLOR}
          <FlatColorPanel
            state={state.flatColorState[state.property.features[state.value].name]}
            dataset={currentDataset}
          />
        {:else if state.property.features[state.value].type === FeatureType.CATEGORICAL}
          <CategoricalPanel
            state={state.categoricalState[state.property.features[state.value].name]}
            dataset={currentDataset}
          />
        {/if}
      {/if}
    {/each}
  </div>
</Section>

<style lang="scss">
  .Viewer-PointCloud {
    width: 320px;
    height: 600px;
    background-color: var(--viewer-background-primary);
    font-size: 14px;
    color: var(--viewer-text-primary);
    font-family: Inter, Arial, 'sans-serif';

    &__title {
      font-style: normal;
      font-weight: 700;
      font-size: 16px;
      line-height: 24px;
      color: var(--viewer-text-primary);
      display: flex;
      align-items: center;
      margin: 0;
      justify-content: space-between;

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

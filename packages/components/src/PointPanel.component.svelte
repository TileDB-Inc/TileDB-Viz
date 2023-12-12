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
  import { GUIEvent, SelectProps, SliderProps, colorScheme } from './types';
  import { Events } from './constants/events';

  export let features = [];
  export let categories = [];
  export let attributes = [];
  export let targets = [];

  let colorGroups: Record<string, string[]> = {};
  let categoryState: Record<
    string,
    Record<string, Record<string, { group: number; selected: boolean }>>
  > = {};
  let flatColorState: Record<
    string,
    Record<string, { fillColor?: string; outlineColor?: string }>
  > = {};

  for (const [idx, target] of targets.entries()) {
    categoryState[target[0]] = {};
    colorGroups[target[0]] = JSON.parse(JSON.stringify(colorScheme));
    for (const [key, values] of Object.entries(categories[idx])) {
      categoryState[target[0]][key] = {};
      for (const name of values as string[]) {
        categoryState[target[0]][key][name] = { group: 0, selected: false };
      }
    }

    flatColorState[target[0]] = {};
    for (const feature of features[idx]) {
      if (feature.type === 3) {
        flatColorState[target[0]][feature.name] = { fillColor: '#FF007F' };
      }
    }
  }

  let state = {
    selectedDataset: 0,
    options: new Array(targets.length).fill(0).map(() => {
      return {
        selectedFeature: 0,
        selectedAttribute: attributes[0],
        pointShape: 1,
        pointSize: 4,
        pointBudget: 100_000,
        quality: 10
      };
    })
  };

  function datasetOnChange(index: number) {
    state.selectedDataset = index;
    state = { ...state };
  }

  function pointShapeOnChange(index: number) {
    state.options[state.selectedDataset].pointShape = index;
    state = { ...state };

    window.dispatchEvent(
      new CustomEvent<GUIEvent<SelectProps>>(Events.SELECT_INPUT_CHANGE, {
        bubbles: true,
        detail: {
          target: `${targets[state.selectedDataset][0]}_shape`,
          props: {
            value: state.options[state.selectedDataset].pointShape
          }
        }
      })
    );
  }

  function pointSizeOnChange(size: number) {
    state.options[state.selectedDataset].pointSize = size;
    state = { ...state };

    window.dispatchEvent(
      new CustomEvent<GUIEvent<SliderProps>>(Events.SLIDER_CHANGE, {
        bubbles: true,
        detail: {
          target: `${targets[state.selectedDataset][0]}_pointSize`,
          props: {
            value: size
          }
        }
      })
    );
  }

  function pointBudgetOnChange(budget: number) {
    state.options[state.selectedDataset].pointBudget = budget;
    state = { ...state };

    window.dispatchEvent(
      new CustomEvent<GUIEvent<SliderProps>>(Events.SLIDER_CHANGE, {
        bubbles: true,
        detail: {
          target: `${targets[state.selectedDataset][0]}_pointBudget`,
          props: {
            value: budget
          }
        }
      })
    );
  }

  function qualityOnChange(quality: number) {
    state.options[state.selectedDataset].quality = quality;
    state = { ...state };

    window.dispatchEvent(
      new CustomEvent<GUIEvent<SliderProps>>(Events.SLIDER_CHANGE, {
        bubbles: true,
        detail: {
          target: `${targets[state.selectedDataset][0]}_quality`,
          props: {
            value: quality
          }
        }
      })
    );
  }

  function featureOnChange(index: number) {
    const feature = features[state.selectedDataset][index];

    if (feature.type === 2) {
      state.options[state.selectedDataset].selectedAttribute = attributes[
        state.selectedDataset
      ].find(x => x.name === feature.attributes[0]);
    }

    state.options[state.selectedDataset].selectedFeature = index;
    state = { ...state };

    window.dispatchEvent(
      new CustomEvent<GUIEvent<SelectProps>>(Events.SELECT_INPUT_CHANGE, {
        bubbles: true,
        detail: {
          target: `${targets[state.selectedDataset][0]}_feature`,
          props: {
            value: state.options[state.selectedDataset].selectedFeature
          }
        }
      })
    );
  }

  $: currentFeature =
    features[state.selectedDataset][
      state.options[state.selectedDataset].selectedFeature
    ];
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
    <Select
      label={'Dataset'}
      options={targets.map(x => x[1])}
      defaultIndex={0}
      callback={datasetOnChange}
    />
    <Slider
      id={'pointBudget'}
      label={'Point budget'}
      min={100_000}
      max={10_000_000}
      value={state.options[state.selectedDataset].pointBudget}
      step={10_000}
      callback={pointBudgetOnChange}
      formatter={value => `${(value / 1_000_000).toFixed(1)}M`}
    />
    <Slider
      id={'quality'}
      label={'Quality'}
      min={1}
      max={50}
      value={state.options[state.selectedDataset].quality}
      step={1}
      callback={qualityOnChange}
      formatter={value => value.toFixed(0)}
    />
    <Select
      label={'Point shape'}
      options={['Square', 'Circle']}
      defaultIndex={1}
      callback={pointShapeOnChange}
    />
    <Slider
      id={'pointSize'}
      label={'Point size'}
      min={1}
      max={10}
      value={state.options[state.selectedDataset].pointSize}
      step={0.01}
      callback={pointSizeOnChange}
    />
    {#if features[state.selectedDataset].length === 0}
      No Available Features
    {:else}
      <Select
        label={'Display feature'}
        options={features[state.selectedDataset].map(x => x.name)}
        defaultIndex={state.options[state.selectedDataset].selectedFeature}
        callback={featureOnChange}
      />
      {#if currentFeature.type === 3}
        <FlatColorPanel
          state={flatColorState[targets[state.selectedDataset][0]][
            currentFeature.name
          ]}
          target={targets[state.selectedDataset][0]}
        />
      {:else if currentFeature.type === 2}
        <CategoricalPanel
          state={categoryState[targets[state.selectedDataset][0]][
            state.options[state.selectedDataset].selectedAttribute.enumeration
          ]}
          target={targets[state.selectedDataset][0]}
          color_groups={colorGroups[targets[state.selectedDataset][0]]}
        />
      {/if}
    {/if}
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

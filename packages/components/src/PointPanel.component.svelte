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
  import { GUIEvent, SelectProps, colorScheme } from './types';
  import { Events } from './constants/events';

	export let features = [];
	export let categories = [];
	export let attributes = [];
	export let targets = [];

  let colorGroups: Record<string, string[]> = {};
	let categoryState: Record<string, Record<string, Record<string, { group: number, selected: boolean }>>> = {};
	let flatColorState: Record<string, Record<string, {fillColor: string, outlineColor: string}>> = {};

  for (const [idx, target] of targets.entries()) {
		categoryState[target[0]] = {};
		colorGroups[target[0]] = JSON.parse(JSON.stringify(colorScheme));
		for (const [key, values] of Object.entries(categories[idx])) {
			categoryState[target[0]][key] = {};
			for (const name of (values as string[])) {
				categoryState[target[0]][key][name] = { group: 0, selected: false };
			}
		}

		flatColorState[target[0]] = {};
		for (const feature of features[idx]) {
			if (feature.type === 3) {
				flatColorState[target[0]][feature.name] = {fillColor: '#0000FF', outlineColor: '#FF0000'};
			}
		}
	}

	let state = {
		selectedDataset: 0,
		options: new Array(targets.length).fill(0).map(() => {
			return {
        selectedFeature: 0,
				pointShape: 1,
				pointSize: 4
			};
		})
	};

	function datasetOnChange(index: number) {
		state.selectedDataset = index;
		state = {...state};
	}

	function pointShapeOnChange(index: number) {
		state.options[state.selectedDataset].pointShape = index;
		state = {...state};
	}

  function pointSizeOnChange(size: number) {
    state.options[state.selectedDataset].pointSize = size;
    state = {...state};
  }

  function featureOnChange(index: number) {
		state.options[state.selectedDataset].selectedFeature = index;
		state = {...state};

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

  
	$: currentFeature = features[state.selectedDataset][state.options[state.selectedDataset].selectedFeature];
	$: attribute = attributes[state.selectedDataset].filter(x=> x.name === currentFeature.attributes[0])[0];
</script>

<Section>
  <div slot="header" class="Viewer-PointCloud__title">
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4.73518 20.1672H19.5261C20.3101 20.1672 20.9184 19.9422 21.3511 19.4921C21.7837 19.0421 22 18.367 22 17.4669V8.29442C22 7.40012 21.7721 6.72793 21.3162 6.27787C20.8603 5.82781 20.1765 5.60279 19.2648 5.60279H10.7892C10.493 5.60279 10.2448 5.56359 10.0444 5.48519C9.84408 5.40679 9.63357 5.27468 9.41289 5.08885L8.88153 4.6446C8.6899 4.482 8.50407 4.35424 8.32404 4.26132C8.14402 4.16841 7.94948 4.10163 7.74042 4.06098C7.53136 4.02033 7.28455 4 7 4H4.40418C3.63763 4 3.0453 4.21777 2.62718 4.65331C2.20906 5.08885 2 5.74797 2 6.63066V17.4669C2 18.367 2.22793 19.0421 2.6838 19.4922C3.13966 19.9422 3.82346 20.1673 4.73519 20.1673L4.73518 20.1672ZM4.7526 18.7648C4.31706 18.7648 3.98314 18.6501 3.75086 18.4207C3.51857 18.1913 3.40242 17.8502 3.40242 17.3972V6.70034C3.40242 6.27061 3.51276 5.94685 3.73343 5.72908C3.95411 5.51131 4.2735 5.40243 4.69162 5.40243H6.63413C6.92449 5.40243 7.1713 5.44163 7.37455 5.52002C7.5778 5.59842 7.78977 5.73344 8.01044 5.92508L8.5418 6.36062C8.72763 6.51741 8.91056 6.64227 9.09058 6.73518C9.27061 6.8281 9.4666 6.89633 9.67857 6.93988C9.89053 6.98344 10.1417 7.00522 10.4321 7.00522H19.2474C19.6771 7.00522 20.0096 7.11991 20.2448 7.34929C20.48 7.57868 20.5976 7.91985 20.5976 8.37281V17.4059C20.5976 17.8531 20.48 18.1913 20.2448 18.4207C20.0096 18.6501 19.6771 18.7648 19.2474 18.7648L4.7526 18.7648ZM2.85364 10.2108H21.1463V8.89544H2.85364V10.2108Z"
        fill="var(--viewer-text-disabled)"
      />
    </svg>
    Point Cloud
  </div>
	<div class="Viewer-PointCloud_main" slot="content">
		<Select label={'Dataset'} options={targets.map(x => x[1])} defaultIndex={0} callback={datasetOnChange} />
		<Select label={'Point shape'} options={['Square', 'Circle']} defaultIndex={1} callback={pointShapeOnChange} />
		<Slider id={'pointSize'} label={'Point size'} min={1} max={10} value={state.options[state.selectedDataset].pointSize} step={0.01} callback={pointSizeOnChange}/>
    {#if features[state.selectedDataset].length === 0}
      No Available Features
    {:else}
      <Select label={'Display feature'} options={features[state.selectedDataset].map(x => x.name)} defaultIndex={state.options[state.selectedDataset].selectedFeature} callback={featureOnChange} />
      {#if currentFeature.type === 3}
        <FlatColorPanel state={flatColorState[targets[state.selectedDataset][0]][currentFeature.name]} target={targets[state.selectedDataset][0]} />
      {:else if currentFeature.type === 2}
        <CategoricalPanel state={categoryState[targets[state.selectedDataset][0]][attribute.enumeration]} target={targets[state.selectedDataset][0]} color_groups={colorGroups[targets[state.selectedDataset][0]]} />
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

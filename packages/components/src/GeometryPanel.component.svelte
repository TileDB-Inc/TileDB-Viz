<svelte:options
  customElement={{
    tag: 'geometry-panel',
    props: {
      features: { type: 'Array' },
			categories: {type: 'Array'},
			attributes: {type: 'Array'},
			targets: { type: 'Array' }
    }
  }}
/>

<script lang="ts">
	import Select from './misc/Select.component.svelte';
	import RenderingSettings from './geometry/Settings.component.svelte';
	import CategoricalPanel from './misc/CategoricalPanel.component.svelte';
	import FlatColorPanel from './misc/FlatColorPanel.component.svelte';
  import { GUIEvent, SelectProps, colorScheme } from './types';
  import { Events } from './constants/events';

	export let features = [];
	export let attributes = [];
	export let categories = [];
	export let targets = [];

	let colorGroups: Record<string, string[]> = {};
	let categoryState: Record<string, Record<string, Record<string, { group: number, selected: boolean }>>> = {};
	let flatColorState: Record<string, Record<string, {fillColor: string, outlineColor: string}>> = {}

	let enumeration: string | undefined;

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
				renderStyle: 0,
				selectedFeature: 0,
				renderingGroup: 0,
				fillOpacity: 1,
				outlineWidth: 1
			};
		})
	};

  function geometryStyleOnChange(style: number) {
		state.options[state.selectedDataset].renderStyle = style;
		state = {...state};

    window.dispatchEvent(
      new CustomEvent<GUIEvent<SelectProps>>(Events.SELECT_INPUT_CHANGE, {
        bubbles: true,
        detail: {
          target: `${targets[state.selectedDataset][0]}_style`,
          props: {
            value: state.options[state.selectedDataset].renderStyle
          }
        }
      })
    );
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

	function datasetOnChange(index: number) {
		state.selectedDataset = index;

		state = {...state};
	}

	function renderingGroupOnChange(renderingGroup: number) {
		state.options[state.selectedDataset].renderingGroup = renderingGroup;
		state = {...state};

    window.dispatchEvent(
      new CustomEvent<GUIEvent<SelectProps>>(Events.SELECT_INPUT_CHANGE, {
        bubbles: true,
        detail: {
          target: `${targets[state.selectedDataset][0]}_renderingGroup`,
          props: {
            value: state.options[state.selectedDataset].renderingGroup
          }
        }
      })
    );
	}

	$: currentFeature = features[state.selectedDataset][state.options[state.selectedDataset].selectedFeature];
	$: attribute = attributes[state.selectedDataset].filter(x=> x.name === currentFeature.attributes[0])[0];
	
</script>

<div class='Viewer-Geometry'>
	<div class='Viewer-Geometry_header'>
		Geometry
	</div>
	<div class='Viewer-Geometry_main'>
		<Select label={'Dataset'} options={targets.map(x => x[1])} defaultIndex={0} callback={datasetOnChange}/>
		<Select label={'Geometry type'} options={['Polygon']}/>
		<Select label={'Rendering Group'} options={['Layer 1', 'Layer 2', 'Layer 3']} defaultIndex={state.options[state.selectedDataset].renderingGroup} callback={renderingGroupOnChange}/>
		<Select label={'Rendering style'} options={['Filled', 'Outline', 'Filled + Outline']} defaultIndex={state.options[state.selectedDataset].renderStyle} callback={geometryStyleOnChange}/>
		<RenderingSettings state={state.options[state.selectedDataset]} target={targets[state.selectedDataset][0]}/>
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
</div>

<style lang="scss">
	.Viewer-Geometry {
		min-width: 320px;
		background-color: var(--viewer-background-primary);
		font-size: 14px;
		color: var(--viewer-text-primary);
    font-family: Inter, Arial, 'sans-serif';
	}

	.Viewer-Geometry_header {
		font-weight: 600;
		font-size: 16px;
		padding: 16px;
	}

	.Viewer-Geometry_main {
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 6px
	}
</style>
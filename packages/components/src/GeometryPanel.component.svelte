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
  import Section from './Section.component.svelte';
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
	let flatColorState: Record<string, Record<string, {fillColor?: string, outlineColor?: string}>> = {}

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

<Section>
  <div slot="header" class="Viewer-Geometry__title">
    <svg
      width="24"
      height="24"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path fill-rule="evenodd" clip-rule="evenodd" d="M46.3289 24.6851L29.2878 41.7261C29.1234 41.8906 28.9589 41.9453 28.7398 41.9453L19.6441 42C19.4249 42 19.2057 41.8903 19.096 41.7808L1.67123 24.3561C1.39735 24.0272 1.39735 23.5888 1.67123 23.2602L18.7123 6.21917C18.8767 6.10942 19.0412 6 19.2604 6H28.356C28.5752 6 28.7944 6.10974 28.9041 6.21917L46.3289 23.6439C46.6028 23.9178 46.6028 24.4112 46.3289 24.6851ZM25.9454 8.46618H21.6715L23.8085 10.5484L25.9454 8.46618ZM25.8907 35.6985L28.9044 38.7122L42.2193 25.3972H36.1919L25.8907 35.6985ZM25.5618 12.3017L36.1924 22.9322H42.2197L28.5211 9.28831L25.5618 12.3017ZM14.0006 23.8083L24.1927 33.9449L34.0011 24.1911L23.809 13.999L14.0006 23.8074V23.8083ZM5.78154 22.6027H11.8089L22.1104 12.3011L19.0968 9.28749L5.78154 22.6027ZM22.0551 39.5343H26.3291L24.1921 37.3973L22.0551 39.5343ZM22.4388 35.6987L11.8082 25.0134H5.78087L19.4795 38.7121L22.4388 35.6987Z" 
        fill="var(--viewer-text-disabled)"
      />
    </svg>
    Geometry
  </div>
  <div class="Viewer-Geometry_main" slot="content">
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
</Section>

<style lang="scss">
  	.Viewer-Geometry {
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
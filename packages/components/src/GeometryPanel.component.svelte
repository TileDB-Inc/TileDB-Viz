<svelte:options
  customElement={{
    tag: 'geometry-panel'
  }}
/>

<script lang="ts">
	import Select from './misc/Select.component.svelte';
	import RenderingSettings from './geometry/Settings.component.svelte';
  import { GUIEvent, SelectProps } from './types';
  import { Events } from './constants/events';

  let renderStyle = 0;

  function geometryStyleOnChange(style: number) {
    renderStyle = style;

    window.dispatchEvent(
      new CustomEvent<GUIEvent<SelectProps>>(Events.SELECT_INPUT_CHANGE, {
        bubbles: true,
        detail: {
          target: 'geometry_style',
          props: {
            value: renderStyle
          }
        }
      })
    );
  }
	
</script>

<div class='Viewer-Geometry'>
	<div class='Viewer-Geometry_header'>
		Geometry
	</div>
	<div class='Viewer-Geometry_main'>
		<Select label={'Geometry type'} options={['Polygon']}/>
		<Select label={'Rendering style'} options={['Filled', 'Outline', 'Filled + Outline']} callback={geometryStyleOnChange}/>
		<RenderingSettings renderStyle={renderStyle}/>
	</div>
</div>

<style lang="scss">
	.Viewer-Geometry {
		width: 320px;
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
<script lang="ts">
	import Slider from '../misc/InlineSlider.component.svelte';
	import { GUIEvent, SliderProps } from '../types';
  import { Events } from '../constants/events';

	export let renderStyle = 0;

	function fillopacityOnChange(value: number) {
    window.dispatchEvent(
      new CustomEvent<GUIEvent<SliderProps>>(Events.SLIDER_CHANGE, {
        bubbles: true,
        detail: {
          target: 'geometry_fillOpacity',
          props: {
            value: value
          }
        }
      })
    );
  }

	function lineThicknessOnChange(value: number) {
    window.dispatchEvent(
      new CustomEvent<GUIEvent<SliderProps>>(Events.SLIDER_CHANGE, {
        bubbles: true,
        detail: {
          target: 'geometry_lineThickness',
          props: {
            value: value
          }
        }
      })
    );
  }
</script>

<div class='Viewer-RenderSettings'>
	{#if renderStyle == 0 || renderStyle == 2}
		<Slider id={'fillopacity'} label={'Fill opacity'} min={0} max={1} value={1} step={0.01} callback={fillopacityOnChange}/>
	{/if}
	{#if renderStyle == 1 || renderStyle == 2}
		<Slider id={'linethickness'} label={'Line thickness'} min={0} max={10} value={1} step={0.01} callback={lineThicknessOnChange}/>
	{/if}
</div>

<style>
	.Viewer-RenderSettings {
		font-size: 14px;
		color: var(--viewer-text-primary);
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
</style>
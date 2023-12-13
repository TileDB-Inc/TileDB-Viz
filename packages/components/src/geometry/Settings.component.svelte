<script lang="ts">
  import Slider from '../misc/InlineSlider.component.svelte';
  import { GUIEvent, SliderProps } from '../types';
  import { Events } from '../constants/events';

  export let target = '';
  export let state: {
    renderStyle: number;
    fillOpacity: number;
    outlineWidth: number;
  } = { renderStyle: 0, fillOpacity: 1, outlineWidth: 1 };

  function fillopacityOnChange(value: number) {
    state.fillOpacity = value;

    window.dispatchEvent(
      new CustomEvent<GUIEvent<SliderProps>>(Events.SLIDER_CHANGE, {
        bubbles: true,
        detail: {
          target: `${target}_fillOpacity`,
          props: {
            value: value
          }
        }
      })
    );
  }

  function lineThicknessOnChange(value: number) {
    state.outlineWidth = value;

    window.dispatchEvent(
      new CustomEvent<GUIEvent<SliderProps>>(Events.SLIDER_CHANGE, {
        bubbles: true,
        detail: {
          target: `${target}_lineThickness`,
          props: {
            value: value
          }
        }
      })
    );
  }
</script>

<div class="Viewer-RenderSettings">
  {#if state.renderStyle == 0 || state.renderStyle == 2}
    <Slider
      id={'fillopacity'}
      label={'Fill opacity'}
      min={0}
      max={1}
      value={state.fillOpacity}
      step={0.01}
      callback={fillopacityOnChange}
    />
  {/if}
  {#if state.renderStyle == 1 || state.renderStyle == 2}
    <Slider
      id={'linethickness'}
      label={'Line thickness'}
      min={0}
      max={10}
      value={state.outlineWidth}
      step={0.01}
      callback={lineThicknessOnChange}
    />
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

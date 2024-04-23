<script lang="ts">
  import Slider from '../misc/InlineSlider.component.svelte';
    import Select from '../misc/Select.component.svelte';
  import { GUISelectPropertyState, GUISliderPropertyState } from '../types';
  import { GeometryStyle } from '@tiledb-inc/viz-common';

  export let dataset = '';
  export let globalState: {
    renderingStyle: GUISelectPropertyState<GeometryStyle>;
    fillOpacity: GUISliderPropertyState;
    outlineWidth: GUISliderPropertyState;
  };
</script>

<div class="Viewer-RenderSettings">
  <Select state={globalState.renderingStyle} dataset={dataset} />
  {#if globalState.renderingStyle == GeometryStyle.FILLED || globalState.renderingStyle == GeometryStyle.FILLED_OUTLINED}
    <Slider state={globalState.fillOpacity} dataset={dataset} />
  {/if}
  {#if globalState.renderingStyle == GeometryStyle.OUTLINED || globalState.renderingStyle == GeometryStyle.FILLED_OUTLINED}
    <Slider state={globalState.outlineWidth} dataset={dataset} />
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

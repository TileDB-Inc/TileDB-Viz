<script lang="ts">
  import { Commands, Events } from '../constants/events';
  import { ButtonProps, GUIEvent } from '../types';
  import { hexToRgb } from '../utils/helpers';

  export let state: { fillColor: string; outlineColor: string } = {
    fillColor: '#0000FF',
    outlineColor: '#FF0000'
  };
  export let target = '';

  function onColorChange(name: string) {
    window.dispatchEvent(
      new CustomEvent<GUIEvent<ButtonProps>>(Events.COLOR_CHANGE, {
        bubbles: true,
        detail: {
          target: `${target}_${name}`,
          props: {
            command: Commands.COLOR,
            data: hexToRgb(state[name])
          }
        }
      })
    );
  }
</script>

<div class="Viewer-ColorPanel">
  <div class="Viewer-ColorPanel__section">
    <div class="Viewer-ColorPanel__section-header">
      Coloring mode - Flat Color
    </div>
    {#if state.fillColor}
      <fragment class="Viewer-ColorPanel__color">
        <label for="fillcolor">Fill Color</label>
        <input
          name="fillcolor"
          type="color"
          bind:value={state.fillColor}
          on:input={e => onColorChange('fillColor')}
        />
      </fragment>
    {/if}
    {#if state.outlineColor}
      <fragment class="Viewer-ColorPanel__color">
        <label for="outlinecolor">Outline Color</label>
        <input
          name="outlinecolor"
          type="color"
          bind:value={state.outlineColor}
          on:input={e => onColorChange('outlineColor')}
        />
      </fragment>
    {/if}
  </div>
</div>

<style lang="scss">
  .Viewer-ColorPanel {
    color: var(--viewer-text-primary);
    font-size: 14px;
    border-top: 1px solid var(--viewer-border);
    border-bottom: 1px solid var(--viewer-border);
    margin-top: 10px;
    padding: 8px 0px;
    font-family: Inter, Arial, 'sans-serif';
  }

  .Viewer-ColorPanel__section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .Viewer-ColorPanel__section-header {
    font-weight: 600;
    padding: 4px 0px;
  }

  .Viewer-ColorPanel__color {
    display: flex;
  }

  label {
    min-width: 100px;
  }

  .Viewer-ColorPanel__color input[type='color'] {
    cursor: pointer;
    -webkit-appearance: none;
    padding: 0;
    border: 1px solid var(--viewer-border);
    border-radius: 4px;
    width: 48px;
    height: 16px;
    margin: auto 0px auto 8px;
  }

  .Viewer-ColorPanel__color input[type='color']::-webkit-color-swatch {
    border: none;
    border-radius: 4px;
    padding: 0;
  }

  .Viewer-ColorPanel__color input[type='color']::-webkit-color-swatch-wrapper {
    border: none;
    border-radius: 4px;
    padding: 0;
  }
</style>

<script lang="ts">
  import { Commands, Events } from '../constants/events';
  import { ButtonProps, GUIEvent, GUIFlatColorState } from '../types';
  import { hexToRgb } from '../utils/helpers';

  export let dataset: string = '';
  export let state: GUIFlatColorState;

  function onColorChange(property: 'fill' | 'outline') {
    window.dispatchEvent(
      new CustomEvent<GUIEvent<ButtonProps>>(Events.COLOR_CHANGE, {
        bubbles: true,
        detail: {
          target: `${dataset}_${property}`,
          props: {
            command: Commands.COLOR,
            data: hexToRgb(state[property])
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
    {#if state.fill}
      <fragment class="Viewer-ColorPanel__color">
        <label for="fillcolor">Fill Color</label>
        <input
          name="fillcolor"
          type="color"
          bind:value={state.fill}
          on:input={e => onColorChange('fill')}
        />
      </fragment>
    {/if}
    {#if state.outline}
      <fragment class="Viewer-ColorPanel__color">
        <label for="outlinecolor">Outline Color</label>
        <input
          name="outlinecolor"
          type="color"
          bind:value={state.outline}
          on:input={e => onColorChange('outline')}
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

    &__section {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    &__section-header {
      font-weight: 600;
      padding: 4px 0px;
    }

    &__color {
      display: flex;
    }

    &__color input[type='color'] {
      cursor: pointer;
      -webkit-appearance: none;
      padding: 0;
      border: 1px solid var(--viewer-border);
      border-radius: 4px;
      width: 48px;
      height: 16px;
      margin: auto 0px auto 8px;
    }

    &__color input[type='color']::-webkit-color-swatch {
      border: none;
      border-radius: 4px;
      padding: 0;
    }

    &__color input[type='color']::-webkit-color-swatch-wrapper {
      border: none;
      border-radius: 4px;
      padding: 0;
    }
  }

  label {
    min-width: 100px;
  }
</style>

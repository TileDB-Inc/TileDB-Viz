<script lang="ts">
    import { GUIEvent } from "@tiledb-inc/viz-common";
    import { Events } from "../constants/events";
  import { GUISliderPropertyState, SliderProps } from "../types";

  export let formatter = (value: number) => { return value.toFixed(2); };
  export let callback = (value: number, dataset: string, property: string) => {};
  export let dataset: string = '';
  export let state: GUISliderPropertyState;

  function onChange() {
    if (callback) {
      callback(state.value, dataset, state.property.id);
    }

    window.dispatchEvent(
      new CustomEvent<GUIEvent<SliderProps>>(Events.SLIDER_CHANGE, {
        bubbles: true,
        detail: {
          target: `${dataset}_${state.property.id}`,
          props: {
            value: state.value
          }
        }
      })
    );
  }
</script>

<div class="Viewer-Slider">
  <label for={'slider' + dataset}>{state.property.name}:</label>
  <input
    name={'slider' + dataset}
    type="range"
    min={state.property.min}
    max={state.property.max}
    step={state.property.step}
    bind:value={state.value}
    on:input={onChange}
  />
  <p class="Viewer-Slider__collapsable">{formatter(state.value)}</p>
</div>

<style lang="scss">
  .Viewer-Slider {
    display: flex;
    font-family: Inter, Arial, 'sans-serif';
    font-size: 14px;
    color: var(--viewer-text-primary);

    label {
      min-width: 140px;
      line-height: 25px;
      vertical-align: middle;
      color: var(--viewer-text-primary);
    }

    &__collapsable {
      margin: 0;
      padding: 0;
      overflow: hidden;
      width: 100%;
      max-width: 0;
      text-align: start;
      transition: max-width 0.2s ease-in-out;
      line-height: 25px;
    }

    input[type='range'] {
      width: 100%;
      appearance: none;
      background: transparent;
      padding: 0px 6px;
      margin: 0px;
      height: 25px;
    }

    &:hover &__collapsable {
      max-width: 46px;
    }

    input[type='range']::-webkit-slider-thumb:hover {
      background: var(--viewer-accent);
      width: 20px;
      height: 20px;
      margin-top: -9px;
    }

    input[type='range']::-webkit-slider-thumb {
      appearance: none;
      content: 10;
      background: var(--viewer-surface-primary);
      width: 16px;
      height: 16px;
      border-radius: 50%;
      margin-top: -7px;
      box-shadow: var(--viewer-shadow-medium);

      transition:
        background 0.2s ease-in-out,
        width 0.2s ease-in-out,
        height 0.2s ease-in-out,
        margin-top 0.2s ease-in-out;
    }

    input[type='range']::-webkit-slider-runnable-track {
      width: 100%;
      height: 1.5px;
      cursor: pointer;
      border-radius: 2px;
      background: var(--viewer-border);
    }

    input[type='range']::-moz-range-thumb:hover {
      background: var(--viewer-accent);
      width: 20px;
      height: 20px;
      margin-top: -9px;
    }

    input[type='range']::-moz-range-thumb {
      appearance: none;
      content: 10;
      background: var(--viewer-surface-primary);
      width: 16px;
      height: 16px;
      border-radius: 50%;
      margin-top: -7px;
      box-shadow: var(--viewer-shadow-medium);

      transition:
        background 0.2s ease-in-out,
        width 0.2s ease-in-out,
        height 0.2s ease-in-out,
        margin-top 0.2s ease-in-out;
    }

    input[type='range']::-moz-range-track {
      width: 100%;
      height: 1.5px;
      cursor: pointer;
      border-radius: 2px;
      background: var(--viewer-border);
    }
  }
</style>

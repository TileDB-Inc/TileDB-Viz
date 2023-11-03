<svelte:options customElement="slider-menu" />

<script lang="typescript">
  import { Events } from './constants/events';
  import { GUIEvent, SliderProps } from './types';

  export let id;
  export let label = '';
  export let value = 255;
  export let step = 0.1;
  export let min = 0;
  export let max = 255;
  export let formatter = (val: number) => val.toFixed(2);
    

  $: valueRounded = formatter(Number(value));

  function onChange(event: Event) {
    window.dispatchEvent(
      new CustomEvent<GUIEvent<SliderProps>>(Events.SLIDER_CHANGE, {
        bubbles: true,
        detail: {
          target: id,
          props: {
            value: value 
          }
        }
      })
    );
  }
</script>

<div class="Viewer-Slider">
  <div class="Viewer-Slider__main">
    <p class="Viewer-Slider__text">
      {label ?? id}
    </p>
    <p class="Viewer-Slider__value">
      {valueRounded}
    </p>
  </div>
  <input
    {id}
    class="Viewer-Slider__range"
    type="range"
    step={Number(step)}
    bind:value={value}
    min={Number(min)}
    max={Number(max)}
    on:input={onChange}
  />
</div>

<style lang="scss">
  .Viewer-Slider {
    background-color: var(--viewer-background-primary);
    border-radius: 12px;
    padding: 12px 12px 20px;
    font-family: Inter, Arial, 'sans-serif';
    width: 100%;
  
    &__text {
      font-family: Inter, Arial, 'sans-serif';
      font-weight: 600;
      font-size: 14px;
      line-height: 20px;
      color: var(--viewer-text-primary);
      margin: 0;
    }
  
    &__main {
      display: flex;
      justify-content: space-between;
    }
  
    &__value {
      background-color: var(--viewer-background-primary);
      border: 1px solid var(--viewer-border);
      border-radius: 6px;
      padding: 6px 16px;
      font-style: normal;
      font-variant-numeric: tabular-nums;
      font-weight: 400;
      font-size: 14px;
      line-height: 20px;
      margin: 0;
      color: var(--viewer-text-primary);
    }
  
    &__range {
      width: 100%;
      -webkit-appearance: none; /* Hides the slider so that custom slider can be made */
      width: 100%; /* Specific width is required for Firefox. */
      background: transparent; /* Otherwise white in Chrome */
  
      &::-webkit-slider-thumb {
        -webkit-appearance: none;
        height: 20px;
        width: 8px;
        border-radius: 7px;
        background: #717171;
        margin-top: -6px;
      }
  
      &::-moz-range-thumb {
        height: 20px;
        width: 8px;
        border-radius: 7px;
        background: #717171;
      }
  
      &::-webkit-slider-runnable-track {
        width: 100%;
        height: 6px;
        cursor: pointer;
        background: #E6E6E6;
        border-radius: 23px;
      }
  
      &::-moz-range-track {
        width: 100%;
        height: 6px;
        cursor: pointer;
        background: #E6E6E6;
        border-radius: 23px;
      }
    }
  }
</style>

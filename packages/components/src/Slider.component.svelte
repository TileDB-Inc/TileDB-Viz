<svelte:options tag="tdb-slider" />

<script>
  import events from './constants/events';

  export let id,
    label = '',
    value,
    min,
    max;

  $: valueRounded = Number(value).toFixed(2);

  function onChange(event) {
    window.dispatchEvent(
      new CustomEvent(events.SLIDER_CHANGE, {
        bubbles: true,
        detail: {
          id,
          value: value
        }
      })
    );
  }
</script>

<div>
  {#if label}
    <label class="tdb-slider__label" for={id}>{label}: {valueRounded}</label>
  {/if}
  <input
    {id}
    type="range"
    class="tdb-slider"
    bind:value
    {min}
    {max}
    on:change={onChange}
  />
</div>

<style>
  .tdb-slider {
    width: 100%;
    height: 24px;
    border-radius: 4px;
    background: transparent;
    outline: none;
    opacity: 1;
    -webkit-appearance: none;
    appearance: none;
  }
  .tdb-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    height: 20px;
    width: 8px;
    border-radius: 7px;
    background: #717171;
    margin-top: -6px;
  }
  .tdb-slider::-moz-range-thumb {
    height: 20px;
    width: 8px;
    border-radius: 7px;
    background: #717171;
  }
  .tdb-slider::-webkit-slider-runnable-track {
    width: 100%;
    height: 6px;
    cursor: pointer;
    background: #e6e6e6;
    border-radius: 23px;
  }
  .tdb-slider::-moz-range-track {
    width: 100%;
    height: 6px;
    cursor: pointer;
    background: #e6e6e6;
    border-radius: 23px;
  }
  .tdb-slider__label {
    color: #fff;
    font-size: 10px;
  }
</style>

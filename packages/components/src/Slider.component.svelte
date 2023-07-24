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
    background: #fff;
    outline: none;
    opacity: 1;
  }

  .tdb-slider__label {
    color: #fff;
    font-size: 10px;
  }
</style>

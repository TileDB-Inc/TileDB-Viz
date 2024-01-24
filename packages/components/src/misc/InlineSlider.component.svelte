<script lang="ts">
  export let id = '';
  export let label = '';
  export let min = 0;
  export let max = 10;
  export let value = 1;
  export let step = 0.1;

  export let callback = (value: number) => {};
  export let formatter = (value: number) => {
    return value.toFixed(2);
  };
</script>

<div class="Viewer-Slider">
  <label for={'slider' + id}>{label}:</label>
  <input
    name={'slider' + id}
    type="range"
    {min}
    {max}
    {step}
    bind:value
    on:input={() => callback(value)}
  />
  <p class="Viewer-Slider__collapsable">{formatter(value)}</p>
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
      text-align: end;
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
      max-width: 30px;
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

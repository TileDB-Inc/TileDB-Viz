<svelte:options customElement="toggle-input" />

<script>
  import { Events } from './constants/events';

  export let id = '';
  export let label;
  export let name;

  let value = false;

  function onChange(event) {
    window.dispatchEvent(
      new CustomEvent(Events.TOGGLE_INPUT_CHANGE, {
        bubbles: true,
        detail: {
          value: value
        }
      })
    );
  }
</script>

<div class="tdb-toggle-wrapper">
  <label class="tdb-switch"
    ><input
      class="tdb-checkbox"
      type="checkbox"
      {name}
      {id}
      bind:checked={value}
      on:change={onChange}
    /><span class="tdb-toggle-slider" /></label
  >
  <p class="tdb-toggle-label">{label}</p>
</div>

<style>
  .tdb-toggle-wrapper {
    display: flex;
    flex-direction: row;
    color: #fff;
    font-size: 10px;
    align-items: center;
  }
  .tdb-switch {
    position: relative;
    display: inline-block;
    width: 32px !important;
    height: 16px !important;
  }
  .tdb-switch input {
    opacity: 0;
  }
  .tdb-toggle-slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc;
    -webkit-transition: 0.4s;
    transition: 0.4s;
    border-radius: 32px;
  }
  .tdb-toggle-slider:before {
    position: absolute;
    content: '';
    height: 8px;
    width: 8px;
    left: 4px;
    bottom: 4px;
    background-color: white;
    -webkit-transition: 0.4s;
    transition: 0.4s;
    border-radius: 50%;
  }
  .tdb-checkbox:checked + .tdb-toggle-slider {
    background-color: #2196f3;
  }
  .tdb-toggle-label {
    margin: 0;
    padding-left: 0.5rem;
  }
  .tdb-checkbox:checked + .tdb-toggle-slider:before {
    -webkit-transform: translateX(1rem);
    -ms-transform: translateX(1rem);
    transform: translateX(1rem);
  }
</style>

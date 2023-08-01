<svelte:options customElement="radio-group" />

<script>
  import capitalize from './utils/capitalize';
  import events from './constants/events';

  export let values = '',
    initialvalue,
    name;

  $: valuesArr = values.split(',');

  function onChange(event) {
    window.dispatchEvent(
      new CustomEvent(events.RADIO_GROUP_CHANGE, {
        bubbles: true,
        detail: {
          value: event.currentTarget.value
        }
      })
    );
  }
</script>

<fieldset class="tdb-fieldset">
  {#each valuesArr as val}
    <label class="tdb-radio-label"
      >{capitalize(val)}<input
        type="radio"
        {name}
        on:change={onChange}
        id={val}
        value={val}
        checked={val === initialvalue}
      /></label
    >
  {/each}
</fieldset>

<style>
  .tdb-fieldset {
    border: none;
  }
  .tdb-radio-label {
    height: 24px;
    display: flex;
    color: #fff;
    flex-direction: row-reverse;
    justify-content: flex-end;
    align-items: center;
    margin-bottom: 7px;
    font-size: 10px;
  }
  .tdb-radio-label input {
    margin: 0 7px 0 0;
    height: 15px;
    width: 15px;
  }
</style>

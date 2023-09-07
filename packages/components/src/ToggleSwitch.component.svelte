<svelte:options customElement="toggle-switch" />

<script>
  import events from './constants/events';

  export let id = '';
  export let label = '';
  export let value = false;

  function onClick(event) {
    value = !value;
    window.dispatchEvent(
      new CustomEvent(events.TOGGLE_INPUT_CHANGE, {
        bubbles: true,
        detail: {
          id,
          value: value
        }
      })
    );
  }
</script>

<div class="Viewer-ToggleSwitch">
  <button
    on:click={onClick}
    class={`Viewer-ToggleSwitch__button ${
      value ? 'Viewer-ToggleSwitch__button--active' : ''
    }`}
  >
    <div
      class={`Viewer-ToggleSwitch__ball ${
        value ? 'Viewer-ToggleSwitch__ball--active' : ''
      }`}
    />
  </button>
  <p class="Viewer-ToggleSwitch__label">{label}</p>
</div>

<style lang="scss">
  .Viewer-ToggleSwitch {
    display: flex;
    align-items: center;

    &__button {
      background-color: #e3e3e3;
      outline: none;
      border: 0;
      border-radius: 36px;
      height: 16px;
      width: 28px;
      position: relative;

      &:hover {
        cursor: pointer;
      }

      &--active {
        background-color: #0070f0;
      }
    }

    &__label {
      color: var(--viewer-text-primary);
      font-family: Inter, Arial, 'sans-serif';
      font-size: 12px;
      font-weight: 600;
      margin-left: 16px;
    }

    &__ball {
      background-color: var(--viewer-surface-primary);
      border-radius: 50%;
      height: 12px;
      width: 12px;
      box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.25);
      position: absolute;
      top: 2px;
      left: 2px;
      transition: left 0.3s ease-in-out;

      &--active {
        left: 14px;
      }
    }
  }
</style>

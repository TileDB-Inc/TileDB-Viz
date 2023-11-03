<script>
  export let value = 0;
  export let min = 0;
  export let max = 0;
  export let onchange = val => {};

  function changeGroup(offset) {
    value = Math.min(Math.max(value + offset, min), max);
    onchange(value);
  }
</script>

<div class="Viewer-Numeric" title="Color group">
  <button
    class="Viewer-Numeric__icon-button"
    disabled={value === min}
    on:click={e => changeGroup(-1)}
  >
    <svg focusable="false" viewBox="10 10 28 28" class="icon">
      <path
        d="M16.3345 25.8568H31.6462C32.2262 25.8568 32.6998 25.6989 33.0672 25.3829C33.4345 25.067 33.6181 24.6254 33.6181 24.058C33.6181 23.4777 33.4377 23.0264 33.0768 22.704C32.7159 22.3817 32.2391 22.2205 31.6462 22.2205H16.3345C15.7416 22.2205 15.2615 22.3817 14.8941 22.704C14.5268 23.0264 14.3432 23.4777 14.3432 24.058C14.3432 24.6254 14.5268 25.067 14.8941 25.3829C15.2615 25.6989 15.7416 25.8568 16.3345 25.8568H16.3345Z"
      />
    </svg>
  </button>
  <input type="number" bind:value readonly />
  <button
    class="Viewer-Numeric__icon-button"
    disabled={value === max}
    on:click={e => changeGroup(1)}
  >
    <svg focusable="false" viewBox="0 0 48 48" class="icon">
      <path
        d="M24.0631 44C24.6413 44 25.1646 43.8556 25.633 43.5669C26.1015 43.2781 26.482 42.9063 26.7748 42.4515C27.0602 41.9968 27.203 41.5059 27.203 40.9789V27.1077H40.926C41.475 27.1077 41.9836 26.967 42.452 26.6854C42.9205 26.4039 43.2974 26.0285 43.5828 25.5593C43.8609 25.0901 44 24.5703 44 24C44 23.4369 43.8573 22.9244 43.5718 22.4624C43.2864 21.9931 42.9058 21.6142 42.4301 21.3254C41.9543 21.0366 41.442 20.8923 40.8931 20.8923H27.159V7.04278C27.159 6.49414 27.0127 5.99243 26.7199 5.53763C26.4272 5.07562 26.0429 4.70384 25.5672 4.42231C25.0914 4.14077 24.5645 4 23.9863 4C23.43 4 22.914 4.13716 22.4383 4.41148C21.9553 4.6858 21.571 5.05396 21.2856 5.51597C21.0001 5.97076 20.8574 6.46888 20.8574 7.01029V20.8489H7.10141C6.55981 20.8489 6.05663 20.9897 5.59188 21.2713C5.11614 21.5528 4.7319 21.9282 4.43914 22.3974C4.14638 22.8594 4 23.3683 4 23.9242C4 24.4945 4.14272 25.0106 4.42816 25.4727C4.7136 25.9347 5.09419 26.3064 5.56992 26.588C6.03833 26.8623 6.54151 26.9995 7.07946 26.9995H20.8245V40.8598C20.8245 41.3868 20.9635 41.874 21.2417 42.3216C21.5198 42.7692 21.9004 43.1373 22.3834 43.4261C22.8592 43.7076 23.3715 43.8484 23.9204 43.8484L24.0631 44Z"
      />
    </svg>
  </button>
</div>

<style lang="scss">
  .Viewer-Numeric {
    display: flex;
    padding: 2px;
    font-family: Inter, Arial, 'sans-serif';
    font-size: 14px;

    input::-webkit-outer-spin-button,
    input::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }

    input[type='number'] {
      -moz-appearance: textfield;
      width: 24px;
      background: var(--viewer-background-primary);
      border: 1px solid var(--viewer-border);
      border-radius: 4px;
      margin: 0px 2px;
      line-height: 16px;
      color: var(--viewer-text-primary);
    }

    &__icon-button {
      background-color: #fff;
      border: 0 solid var(--viewer-border);
      border-radius: 4px;
      box-sizing: border-box;
      cursor: pointer;
      display: inline-block;
      box-shadow: var(--viewer-shadow-small);
      padding: 0px;
      width: 16px;
    }

    &__icon-button:hover {
      background-color: var(--viewer-accent);
    }

    &__icon-button:hover svg {
      color: #fff;
      fill: #fff;
    }
  }

  .icon {
    vertical-align: middle;
    margin: auto;
    width: 10px;
    height: 10px;
    fill: var(--viewer-text-primary);
    background: transparent;
    pointer-events: none;
  }
</style>

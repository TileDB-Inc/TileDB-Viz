<script lang="ts">
  export let id: string = '';
  export let value = false;

  export let callback = (value: boolean) => {};
</script>

<div class="Viewer-Checkbox">
  <input
    type="checkbox"
    id={'checkbox' + id}
    checked={value}
    on:click={e => callback(e.target.checked)}
  />
  <label for={'checkbox' + id}>
    <svg focusable="false" viewBox="0 0 48 48" class="icon">
      <path
        d="M19.4561 43.8944C20.7975 43.8944 21.8294 43.349 22.5517 42.2581L43.2483 10.3289C43.5136 9.93091 43.7052 9.54764 43.8232 9.17911C43.9411 8.81058 44.0001 8.45679 44.0001 8.11775C44.0001 7.2038 43.7015 6.45568 43.1045 5.87341C42.5075 5.29114 41.7447 5 40.816 5C40.1821 5 39.6477 5.1253 39.2129 5.3759C38.778 5.6265 38.3689 6.06136 37.9857 6.68049L19.3677 36.1333L9.85967 24.1488C9.15209 23.2643 8.275 22.8221 7.22838 22.8221C6.29968 22.8221 5.52946 23.1206 4.9177 23.7176C4.30595 24.3146 4.00007 25.0701 4.00007 25.984C4.00007 26.3968 4.07009 26.7911 4.21013 27.167C4.35017 27.5429 4.59709 27.9299 4.95087 28.3279L16.3826 42.3688C17.2228 43.3859 18.2473 43.8945 19.4561 43.8945L19.4561 43.8944Z"
      />
    </svg>
  </label>
</div>

<style lang="scss">
  .Viewer-Checkbox {
    input[type='checkbox'] {
      visibility: hidden;
      display: none;
      opacity: 0;
    }

    label {
      background: var(--viewer-background-primary);
      border: 1px solid var(--viewer-border);
      border-radius: 5px;
      width: 14px;
      height: 14px;
      display: block;
      cursor: pointer;
    }

    input[type='checkbox']:checked + label {
      background-color: var(--viewer-accent);
      border-color: var(--viewer-accent);
    }

    input[type='checkbox']:checked + label svg {
      fill: #fff;
    }
  }

  .icon {
    margin: auto;
    width: 10px;
    height: 10px;
    fill: transparent;
    background: transparent;
    pointer-events: none;
    padding: 2px 2px;
  }
</style>

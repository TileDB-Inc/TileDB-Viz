<script lang="ts">
  export let label = '';
  export let options = [];
  export let defaultIndex = 0;

  export let callback = (value: number) => {};
</script>

<div class="Viewer-Select">
  <label for="options">{label}:</label>
  <div class="Viewer-Select__control">
    <select
      name="options"
      on:change={event => callback(Number.parseInt(event.target.value))}
    >
      {#each options as name, index}
        <option selected={index === defaultIndex} value={index}>{name}</option>
      {/each}
    </select>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="icon"
      focusable="false"
      viewBox="0 0 48 48"
    >
      <path
        d="M24 33C23.4948 33.0009 22.9945 32.9006 22.5287 32.7051C22.0628 32.5095 21.6409 32.2227 21.2877 31.8615L7.69042 18.0791C7.24757 17.6279 6.99963 17.0209 7 16.3886C7.00037 15.7564 7.24902 15.1497 7.69239 14.699C7.91034 14.4775 8.17023 14.3015 8.45689 14.1815C8.74355 14.0615 9.05125 13.9998 9.36203 14C9.6728 14.0002 9.98043 14.0622 10.2669 14.1826C10.5535 14.303 10.8131 14.4792 11.0308 14.701L24 27.8475L36.9692 14.701C37.1869 14.4793 37.4466 14.3032 37.7332 14.1829C38.0197 14.0626 38.3273 14.0005 38.638 14.0003C38.9487 14.0002 39.2564 14.0618 39.5431 14.1818C39.8297 14.3017 40.0896 14.4776 40.3076 14.699C40.751 15.1497 40.9997 15.7564 41 16.3886C41.0004 17.0208 40.7525 17.6279 40.3096 18.0791L26.7129 31.8615C26.3595 32.2227 25.9375 32.5095 25.4715 32.705C25.0056 32.9005 24.5053 33.0008 24 33Z"
      />
    </svg>
  </div>
</div>

<style lang="scss">
  .Viewer-Select {
    font-family: Inter, Arial, 'sans-serif';
    font-size: 14px;
    display: flex;
    gap: 6px;

    label {
      min-width: 140px;
      line-height: 25px;
      vertical-align: middle;
    }

    select {
      appearance: none;
      outline: 10px red;
      border: 0;
      box-shadow: none;

      font-family: Inter, Arial, 'sans-serif';
      flex: 1;
      padding: 0 6px;
      color: var(--viewer-text-primary);
      background-color: #fff;
      cursor: pointer;
    }

    &__control {
      position: relative;
      display: flex;
      width: 100%;
      height: 25px;
      border-radius: 6px;
      overflow: hidden;
      box-shadow: var(--viewer-shadow-small);
    }

    &__control svg {
      position: absolute;
      right: 0;
      padding: 4px;
      background-color: #fff;
      transition: 0.25s all ease;
      pointer-events: none;
    }

    &__control:hover svg {
      fill: var(--viewer-accent);
    }
  }

  .icon {
    vertical-align: bottom;
    margin: auto;
    width: 16px;
    height: 16px;
    fill: var(--viewer-text-primary);
    background: transparent;
    pointer-events: none;
  }
</style>

<svelte:options customElement="scale-bar" />

<script>
  import { unitFormatter, lengthConverter } from './utils/helpers';
  import { onMount, onDestroy } from 'svelte';
  import events from './constants/events';

  export let basePhysicalSize = 0;
  export let basePhysicalSizeUnit = 'μm';
  export let zoom = -2;
  export let scalebarLength = 160;

  function zoomInfoUpdate(e) {
    if (e.detail.type === 'ZOOM_INFO')
    {
      zoom = e.detail.zoom;
    }
  }

  onMount(() => {
    window.addEventListener(
      events.ENGINE_INFO_UPDATE,
      zoomInfoUpdate,
      {
        capture: true
      }
    );
  });

  onDestroy(() => {
    window.removeEventListener(events.ENGINE_INFO_UPDATE, zoomInfoUpdate, {
      capture: true
    });
  });
</script>

{#if Number(basePhysicalSize) > 0}
  <div class="ViewerScalebar" style="--scalebar-length: {scalebarLength}">
    <p class="ViewerScalebar__text">
      {unitFormatter(
        ...lengthConverter(
          Number(basePhysicalSize) * Math.pow(2, 5 - zoom) * scalebarLength,
          basePhysicalSizeUnit
        )
      )}
    </p>
  </div>
{/if}

<style lang="scss">
  .ViewerScalebar {
    position: absolute;
    left: 20px;
    bottom: 40px;
    width: calc(var(--scalebar-length) * 1px);
    height: 10px;
    background: linear-gradient(to right, white 50%, black 50%);
    border: 1px solid black;
    box-sizing: border-box;

    &__text {
      width: calc(var(--scalebar-length) * 1px);
      height: 15px;
      margin: 0;
      box-sizing: border-box;
      left: -1px;
      position: absolute;
      text-align: center;
      top: 10px;
      font-family: Inter, Arial, 'sans-serif';
      font-weight: 500;
      font-size: 14px;
      color: white;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.96);
    }
  }
</style>

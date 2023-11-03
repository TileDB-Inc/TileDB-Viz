<svelte:options customElement="status-overlay" />

<script>
  import { onMount, onDestroy } from 'svelte';
  import { Events } from './constants/events';

  let tiles = 0;

  function loadingTilesUpdate(e) {
    if (e.detail.type === 'LOADING_TILE') {
      tiles += e.detail.loaded ? -1 : 1;
    }
  }

  onMount(() => {
    window.addEventListener(Events.ENGINE_INFO_UPDATE, loadingTilesUpdate, {
      capture: true
    });
  });

  onDestroy(() => {
    window.removeEventListener(Events.ENGINE_INFO_UPDATE, loadingTilesUpdate, {
      capture: true
    });
  });
</script>

{#if tiles > 0}
  <div class="Viewer-StatusOverlay">
    Loading tiles... {tiles} {tiles === 1 ? 'tile' : 'tiles'} remaining
  </div>
{/if}

<style lang="scss">
  .Viewer-StatusOverlay {
    font-family: Inter, Arial, 'sans-serif';
    box-shadow: var(--viewer-shadow-medium);
    position: absolute;
    top: 40px;
    left: 0;
    width: 260px;
    margin: auto;
    text-align: center;
    right: 0;
    background-color: #129dff;
    color: white;
    padding: 8px;
    border-radius: 50px;
    opacity: 75%;
    pointer-events: none;
  }
</style>

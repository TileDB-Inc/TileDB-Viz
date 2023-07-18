<svelte:options tag="menu-panel" />

<script>
  import { onMount, onDestroy } from 'svelte';
  export let id;

  let visible = false;

  function toggleVissible(e) {
    if (e.detail?.id === id) {
      visible = !visible;
    }
  }

  onMount(() => {
    const CUSTOM_EVENT = 'floating-button::click';
    window.addEventListener(CUSTOM_EVENT, toggleVissible, {
      capture: true
    });
  });

  onDestroy(() => {
    window.removeEventListener(CUSTOM_EVENT, toggleVissible, {
      capture: true
    });
  });
</script>

{#if visible}
  <div class="menu-panel"><slot /></div>
{/if}

<style>
  .menu-panel {
    background-color: #494949cc;
    position: absolute;
    box-sizing: border-box;
    bottom: 33px;
    right: 75px;
    height: 545px;
    padding: 1em;
    border-radius: 6px;
    max-height: calc(100vh - 33px);
    overflow: auto;
    font-family: Inter, sans-serif;
    width: 240px;
  }
</style>

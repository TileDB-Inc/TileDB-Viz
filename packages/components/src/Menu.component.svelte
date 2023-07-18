<svelte:options tag="menu-panel" />

<script>
  import { onMount, onDestroy } from 'svelte';
  let id;

  let visible = true;

  function toggleVissible() {
    console.log('toggling');
    visible = !visible;
  }

  onMount(() => {
    const CUSTOM_EVENT = 'floating-button::click';
    console.log('MOUNT');
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

<svelte:options customElement="menu-panel" />

<script>
  import { onMount, onDestroy } from 'svelte';
  import events from './constants/events';

  export let id;

  let visible = false;

  function toggleVissible(e) {
    if (e.detail?.id === id) {
      visible = !visible;
    } else {
      visible = false;
    }
  }

  onMount(() => {
    window.addEventListener(events.FLOATING_BUTTON_CLICK, toggleVissible, {
      capture: true
    });
  });

  onDestroy(() => {
    window.removeEventListener(events.FLOATING_BUTTON_CLICK, toggleVissible, {
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
    min-height: 500px;
    padding: 1em;
    border-radius: 6px;
    max-height: calc(100vh - 33px);
    overflow: auto;
    font-family: Inter, sans-serif;
    width: 240px;
  }
</style>

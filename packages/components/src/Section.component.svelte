<svelte:options tag="section-menu" />

<script>
  import Header from './Header.component.svelte';
  import { accordion } from './utils/animation-helpers';
  import events from './constants/events';
  import { onMount, onDestroy } from 'svelte';

  export let id = '';

  let height;
  let maxHeight;
  let visible = true;

  function toggleVissible(e) {
    visible = e.detail.value;
    console.log(visible);
  }

  onMount(() => {
    window.addEventListener(
      events.MENU_HEADER_VISIBILITY_TOGGLE + id,
      toggleVissible,
      {
        capture: true
      }
    );

    maxHeight = height;
  });

  onDestroy(() => {
    window.removeEventListener(
      events.MENU_HEADER_VISIBILITY_TOGGLE + id,
      toggleVissible,
      {
        capture: true
      }
    );
  });
</script>

<div class="Viewer-Section">
  <header-menu {id} visibleContent={visible}>
    <slot name="header" />
  </header-menu>
  <div
    bind:clientHeight={height}
    class="Viewer-Section__container"
    style="max-height: {visible ? maxHeight : 0}px;"
  >
    <slot name="content" />
  </div>
</div>

<style lang="scss">
  .Viewer-Section {
    margin-bottom: 16px;
    width: 100%;

    &__container {
      overflow: hidden;
      transition: 0.8s max-height;
    }
  }
</style>

<svelte:options customElement="section-menu" />

<script>
  import Header from './Header.component.svelte';
  import { onMount } from 'svelte';

  let height;
  let maxHeight;
  let visible = true;

  onMount(() => {
    maxHeight = height;
  });
</script>

<div class="Viewer-Section">
  <Header visibleContent={visible} toggleCallback={(showContent) => visible = showContent}>
    <slot name="header" />
  </Header>
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

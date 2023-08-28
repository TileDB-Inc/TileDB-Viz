<svelte:options customElement="section-menu" />

<script>
  import Header from './Header.component.svelte';
  import { onMount, afterUpdate  } from 'svelte';

  export let id = '';

  let element;
  let maxHeight;
  let visible = true;
  
  onMount(() => {
    maxHeight = element.scrollHeight;
  });

  afterUpdate(() => {
    maxHeight = element.scrollHeight;
  });

</script>

<div class="Viewer-Section">
  <Header {id} visibleContent={visible} toggleCallback={(showContent) => visible = showContent}>
    <slot name="header" />
  </Header>
  <div
    bind:this={element}
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

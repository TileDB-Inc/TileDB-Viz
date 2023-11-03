<svelte:options customElement="section-menu" />

<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
</svelte:head>

<script>
  import Header from './Header.component.svelte';
  import { onMount, afterUpdate  } from 'svelte';

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
  <Header visibleContent={visible} toggleCallback={(showContent) => visible = showContent}>
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

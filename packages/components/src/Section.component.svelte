<svelte:options tag="section-menu" />

<script>
    import Header from "./Header.component.svelte";

    let visible = true; 
</script>

<div class="Viewer-Section">
    <header-menu>
        <slot name="header" />
    </header-menu>
    <div class="Viewer-Section__container">
        <slot name="content" />
    </div>
</div>

<style lang="scss">
.Viewer-Section {
    margin-bottom: 16px;
    width: 100%;
  
    &__container {
        overflow: hidden;
        transition: 0.8s max-height
    }
  }
</style>
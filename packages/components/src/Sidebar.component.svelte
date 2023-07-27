<svelte:options tag="sidebar-menu" />

<script>

</script>

<div class="Viewer-Sidebar">
    <slot />
</div>

<style lang="scss">
    .Viewer-Sidebar {
        position: absolute;
        top: 16px;
        right: 0px;
        width: 360px;
        border-radius: 0px 8px 8px 0px;
        border-left: 1px solid var(--viewer-border-disabled, #E6E6E6);
        background-color: var(--viewer-surface-primary);
        box-shadow: var(--viewer-shadow-small);
        overflow-y: auto;
        padding: 16px 10px;
        height: calc(100vh - 32px);
    }
</style>

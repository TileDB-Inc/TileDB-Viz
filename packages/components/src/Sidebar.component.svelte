<svelte:options tag="sidebar-menu" />

<script>
  import { onMount, onDestroy } from 'svelte';

  let active = true;
  let width, maxWidth;

  onMount(() => {
    maxWidth = width;
  });
</script>

<div class="Viewer-SidebarContainer">
  <button class="Viewer-ToggleMenu" title="Toggle sidebar" on:click={() => active = !active}>
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M13.3333 3.33325C13.3333 2.96506 13.0349 2.66659 12.6667 2.66659H10.6667V13.3333H12.6667C13.0349 13.3333 13.3333 13.0348 13.3333 12.6666V3.33325ZM9.33334 13.3333V2.66659H3.33334C2.96515 2.66659 2.66667 2.96506 2.66667 3.33325V12.6666C2.66667 13.0348 2.96515 13.3333 3.33334 13.3333H9.33334ZM10 1.33325H12.6667C13.7712 1.33325 14.6667 2.22868 14.6667 3.33325V12.6666C14.6667 13.7712 13.7712 14.6666 12.6667 14.6666H10H3.33334C2.22877 14.6666 1.33334 13.7712 1.33334 12.6666V3.33325C1.33334 2.22868 2.22877 1.33325 3.33334 1.33325H10Z"
        fill={active ? '#0070F0' : 'var(--viewer-text-tertiary)'}
      />
    </svg>
  </button>
  <div bind:clientWidth={width} style="max-width: {active ? maxWidth : 0}px; transition: 0.8s max-width; overflow: hidden;">
    <div class="Viewer-Sidebar">
      <slot />
    </div>
  </div>
</div>

<style lang="scss">
  .Viewer-SidebarContainer {
    display: flex;
    position: absolute;
    top: 16px;
    right: 0px;
    flex-direction: row;
  }

  .Viewer-ToggleMenu {
    background-color: var(--viewer-background-primary);
    box-shadow: var(--viewer-shadow-small);
    padding: 8px;
    border-radius: 6px;
    border: 0;
    margin: 16px;
    height: fit-content;

    &::hover {
      cursor: pointer;
    }
  }

  .Viewer-Sidebar {
    width: 360px;
    border-radius: 8px 0px 0px 8px;
    border-left: 1px solid var(--viewer-border-disabled, #e6e6e6);
    background-color: var(--viewer-surface-primary);
    box-shadow: var(--viewer-shadow-small);
    overflow-y: auto;
    padding: 16px 10px;
    max-height: calc(100vh - 32px);
  }
</style>

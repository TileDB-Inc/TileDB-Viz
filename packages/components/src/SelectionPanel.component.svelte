<svelte:options
  customElement={{
    tag: 'selection-panel'
  }}
/>

<script lang="ts">
  import { GUIEvent } from '@tiledb-inc/viz-common';
  import { ButtonProps } from './types';
  import { Commands, Events } from './constants/events';
  import { PickingMode } from '@tiledb-inc/viz-common';
  import { onMount } from 'svelte';
  import InfoPanel from './InfoPanel.component.svelte';

  let expandableWindowsState: Record<
    string,
    { active: boolean; width: number; reference: any }
  > = {
    'info-panel': { active: false, width: 0, reference: undefined }
  };

  onMount(() => {
    for (const value of Object.values(expandableWindowsState)) {
      value.width = value.reference.scrollWidth;
    }
  });

  let selectionToolState: Record<
    string,
    { state: boolean; mode: PickingMode }
  > = {
    'single-select': { state: false, mode: PickingMode.SINGLE },
    'lasso-select': { state: false, mode: PickingMode.LASSO }
  };

  function expandableWindowOnChange(id: string) {
    for (const key of Object.keys(expandableWindowsState)) {
      if (key !== id) {
        expandableWindowsState[key].active = false;
      } else {
        expandableWindowsState[key].active =
          !expandableWindowsState[key].active;
      }
    }
  }

  function onSelectionToolClick(tool: string) {
    for (const key of Object.keys(selectionToolState)) {
      if (key !== tool) {
        selectionToolState[key].state = false;
      } else {
        selectionToolState[key].state = !selectionToolState[key].state;
      }
    }

    window.dispatchEvent(
      new CustomEvent<GUIEvent<ButtonProps>>(Events.BUTTON_CLICK, {
        bubbles: true,
        detail: {
          target: `picking-tool`,
          props: {
            command: Commands.PICKING_TOOL_SELECT,
            data: selectionToolState[tool].state
              ? selectionToolState[tool].mode
              : PickingMode.NONE
          }
        }
      })
    );
  }
</script>

<div class="Viewer-SelectionPanel">
  <div class="anchor-top">
    <button
      title="Selection Results"
      class="Viewer-SelectionPanel__option"
      class:selected={expandableWindowsState['info-panel'].active}
      on:click={() => expandableWindowOnChange('info-panel')}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="icon"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        fill="none"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path stroke="none" d="M0 0h24v24H0z" fill="none" /><path
          d="M9 5h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2h-2"
        /><path
          d="M9 3m0 2a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v0a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2z"
        /><path d="M9 17v-5" /><path d="M12 17v-1" /><path d="M15 17v-3" />
      </svg>
    </button>
    <div class="separator"></div>
    <!-- Selection tools - Start -->
    <button
      title="Single Select Tool"
      class="Viewer-SelectionPanel__option"
      class:selected={selectionToolState['single-select'].state}
      on:click={() => onSelectionToolClick('single-select')}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="icon"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        fill="none"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path stroke="none" d="M0 0h24v24H0z" fill="none" /><path
          d="M14.778 12.222l3.113 -2.09a1.2 1.2 0 0 0 -.309 -2.228l-13.582 -3.904l3.904 13.563a1.2 1.2 0 0 0 2.228 .308l2.09 -3.093l.381 .381"
        /><path
          d="M21.121 20.121a3 3 0 1 0 -4.242 0c.418 .419 1.125 1.045 2.121 1.879c1.051 -.89 1.759 -1.516 2.121 -1.879z"
        /><path d="M19 18v.01" />
      </svg>
    </button>
    <button
      title="Lasso Tool"
      class="Viewer-SelectionPanel__option"
      class:selected={selectionToolState['lasso-select'].state}
      on:click={() => onSelectionToolClick('lasso-select')}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="icon"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        fill="none"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path stroke="none" d="M0 0h24v24H0z" fill="none" /><path
          d="M4.028 13.252c-.657 -.972 -1.028 -2.078 -1.028 -3.252c0 -3.866 4.03 -7 9 -7s9 3.134 9 7s-4.03 7 -9 7c-1.913 0 -3.686 -.464 -5.144 -1.255"
        /><path d="M5 15m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /><path
          d="M5 17c0 1.42 .316 2.805 1 4"
        />
      </svg>
    </button>
    <!-- Selection tools - End -->
    <div class="separator"></div>
  </div>

  <div class="anchor-bottom">
    <button class="Viewer-SelectionPanel__option">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="icon"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        fill="none"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path stroke="none" d="M0 0h24v24H0z" fill="none" /><path
          d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"
        /><path d="M12 9h.01" /><path d="M11 12h1v4h1" />
      </svg>
    </button>
  </div>
</div>

<div
  bind:this={expandableWindowsState['info-panel'].reference}
  class="Viewer-SelectionPanel__container"
  style="max-width: {expandableWindowsState['info-panel'].active
    ? expandableWindowsState['info-panel'].width
    : 0}px; transition: 0.8s max-width; overflow: hidden;"
>
  <div
    class="Viewer-SelectionPanel__sidewindow"
    style="--expanded-width: 600px"
  >
    <InfoPanel></InfoPanel>
  </div>
</div>

<style lang="scss">
  .Viewer-SelectionPanel {
    position: absolute;
    top: 0;
    left: 0;
    width: 48px;
    height: 100vh;
    background: var(--viewer-background-primary);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    z-index: 2;
    box-shadow: var(--viewer-shadow-medium);

    &__option {
      border: solid 1px var(--viewer-border);
      width: 32px;
      height: 32px;
      background-color: var(--viewer-background-primary);
      margin-left: 8px;
      margin-right: 8px;
      box-shadow: var(--viewer-shadow-small);
      border-radius: 4px;
      color: rgb(140, 140, 140);
      padding: 0px;

      &:hover {
        background-color: var(--viewer-accent-40);
      }
    }

    &__container {
      position: absolute;
      top: 32px;
      left: 48px;
      z-index: 1;
    }

    &__sidewindow {
      width: var(--expanded-width);
      background-color: var(--viewer-surface-primary);
      box-shadow: var(--viewer-shadow-small);
      overflow-y: auto;
      padding: 16px 10px;
      max-height: calc(100vh - 32px);
      direction: ltr;
      border-right: 1px solid var(--viewer-border-disabled, #e6e6e6);
      border-radius: 0px 8px 8px 0px;
    }
  }

  .icon {
    width: 24px;
    height: 32px;
    color: inherit;
  }

  .anchor-top,
  .anchor-bottom {
    margin-top: 32px;
    margin-bottom: 32px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .selected {
    background-color: var(--viewer-accent);
    color: white;
  }

  .separator {
    width: 36px;
    margin-left: 6px;
    margin-right: 6px;
    border-top: solid 1px var(--viewer-border);
  }
</style>

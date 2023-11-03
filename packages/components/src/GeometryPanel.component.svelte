<svelte:options customElement="geometry-panel" />

<script lang="typescript">
  import { onMount, onDestroy } from 'svelte';
  import Section from './Section.component.svelte';
  import TypedTextBox from './TypedTextBox.component.svelte';
  import { Commands, Events } from './constants/events';
  import { ButtonProps, GUIEvent } from './types';

  export let attributes = '[]';

  let selectedGeometry = undefined;

  function loadPickedObject(event: CustomEvent<GUIEvent>) {
    const target = event.detail.target.split('_');

    if (target[0] !== 'geometry') 
    {
      return;
    }

    selectedGeometry = event.detail.props;

    event.stopPropagation();
  }

  function clearSelectedGeometry() {
    selectedGeometry = undefined;

    window.dispatchEvent(
      new CustomEvent<GUIEvent<ButtonProps>>(Events.BUTTON_CLICK, {
        bubbles: true,
        detail: {
          target: 'geometry',
          props: {
            command: Commands.CLEAR
          }
        }
      })
    );
  }

  onMount(() => {
    window.addEventListener(Events.PICK_OBJECT, loadPickedObject, {
      capture: true
    });
  });

  onDestroy(() => {
    window.removeEventListener(Events.PICK_OBJECT, loadPickedObject, {
      capture: true
    });
  });

  let attributeMap = new Map(
    JSON.parse(attributes ?? '[]').map(item => [item.name, item])
  );
</script>

<Section>
  <div slot="header" class="Viewer-GeometrySelector__title">
    <svg
      width="24"
      height="24"
      viewBox="0 0 304 296"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="45"
        y="109"
        width="96"
        height="96"
        stroke="var(--viewer-text-disabled)"
        stroke-width="14"
      />
      <path
        d="M90.1724 137.5L143 46L195.828 137.5H90.1724Z"
        stroke="var(--viewer-text-disabled)"
        stroke-width="14"
      />
      <circle
        cx="212"
        cy="203"
        r="48"
        stroke="var(--viewer-text-disabled)"
        stroke-width="14"
      />
    </svg>
    Geometry
  </div>
  <div class="Viewer-GeometrySelector__content" slot="content">
    {#if selectedGeometry !== undefined}
      <div class="Viewer-GeometrySelector__pickInfo">
        {#each Object.entries(selectedGeometry).sort( (a, b) => (a[0] > b[0] ? 1 : b[0] > a[0] ? -1 : 0) ) as [key, value]}
          {#if attributeMap.has(key)}
            <TypedTextBox attribute={attributeMap.get(key)} {value} />
          {/if}
        {/each}
        <div class="Viewer-GeometrySelector__controls">
          <button
            class="Viewer-GeometrySelector__button"
            on:click={() => clearSelectedGeometry()}
          >
            Clear
          </button>
        </div>
      </div>
    {:else}
      <div class="Viewer-GeometrySelector__text">No geometry is selected.</div>
    {/if}
  </div>
</Section>

<style lang="scss">
  .Viewer-GeometrySelector {
    display: flex;
    font-family: Inter, Arial, 'sans-serif';
    flex-direction: column;

    &__enabled {
      fill: var(--viewer-enabled);
    }

    &__text {
      font-family: Inter, Arial, 'sans-serif';
      font-size: 14px;
    }

    &__title {
      font-style: normal;
      font-weight: 700;
      font-size: 16px;
      line-height: 24px;
      color: var(--viewer-text-primary);
      display: flex;
      align-items: center;
      margin: 0;
      justify-content: space-between;

      svg {
        margin-right: 10px;
      }
    }

    &__button {
      background-color: var(--viewer-background-primary);
      color: var(--viewer-text-primary);
      border: 2px solid #0070f0;
      border-radius: 100px;
      padding: 6px;
      font-family: Inter, Arial, 'sans-serif';
      font-size: 14px;
      font-weight: 600;

      &:hover {
        background-color: #0070f0;
        color: hsla(0deg, 0%, 100%, 1);
      }
    }

    &__content {
      overflow: hidden;
      transition: 0.8s max-height;
      display: flex;
      flex-direction: column;
    }

    &__controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 10px 6px 6px;
    }

    &__list {
      list-style: none;
      padding: 0 1px;
      margin: 16px 0;
    }

    &__value {
      border: 1px solid var(--viewer-border);
      border-radius: 6px;
      padding: 6px 16px;
      margin: 0;
      height: 40px;
      font-style: normal;
      font-weight: 400;
      font-size: 14px;
      color: rgba(0, 0, 0, 0.87);
    }

    &__item {
      padding-left: 16px;
      padding-right: 16px;

      display: flex;
      flex-direction: row;
      justify-content: space-between;
      color: var(--viewer-text-primary);
      line-height: 16px;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;

      &:last-child {
        margin-bottom: 0;
      }
    }
  }
</style>

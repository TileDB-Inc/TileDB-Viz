<svelte:options tag="dimension-panel" />

<script>
  import Section from './Section.component.svelte';
  import Sliderr from './Sliderr.component.svelte';

  export let dimensions = '[]';
</script>

<section-menu id={'dimension-panel'} class="Viewer-ControlPanel">
  <div slot="header" class="Viewer-ControlPanel__title">
    <svg
      width="20"
      height="20"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2 1a1 1 0 1 0 0 2 1 1 0 0 0 0-2zM0 2a2 2 0 0 1 3.937-.5h8.126A2 2 0 1 1 14.5 3.937v8.126a2 2 0 1 1-2.437 2.437H3.937A2 2 0 1 1 1.5 12.063V3.937A2 2 0 0 1 0 2zm2.5 1.937v8.126c.703.18 1.256.734 1.437 1.437h8.126a2.004 2.004 0 0 1 1.437-1.437V3.937A2.004 2.004 0 0 1 12.063 2.5H3.937A2.004 2.004 0 0 1 2.5 3.937zM14 1a1 1 0 1 0 0 2 1 1 0 0 0 0-2zM2 13a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm12 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"
        fill="var(--viewer-text-disabled)"
      />
    </svg>
    Extra Dimensions
  </div>
  <ul class="Viewer-ControlPanel__list" slot="content">
    {#each JSON.parse(dimensions) as dimension, index}
      <li class="Viewer-ControlPanel__item">
        <slider-menu
          class="Viewer-ControlPanel__slider"
          id={`d_${index}`}
          label={dimension.name}
          value={dimension.value}
          min={dimension.min}
          max={dimension.max}
          step={1}
        />
      </li>
    {/each}
  </ul>
</section-menu>

<style lang="scss">
  .Viewer-ControlPanel {
    font-family: Inter, Arial, 'sans-serif';

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

    &__slider {
      width: 100%;
    }

    &__list {
      list-style: none;
      padding-left: 0;
      margin: 0;

      overflow: hidden;
      transition: 0.8s max-height;
    }

    &__item {
      margin-bottom: 8px;
      display: flex;

      &:last-child {
        margin-bottom: 0;
      }
    }
  }
</style>

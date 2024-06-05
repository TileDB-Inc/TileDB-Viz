<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Events } from './constants/events';
  import { GUIChannelPropertyState, GUISelectPropertyState } from './types';
  import Select from './misc/Select.component.svelte';
  import {
    GUIEvent,
    ImagePanelInitializationEvent
  } from '@tiledb-inc/viz-common';
  import ChannelIntensitySlider from './misc/ChannelIntensitySlider.component.svelte';

  let datasetPropertyState: GUISelectPropertyState = {
    property: {
      name: 'Dataset',
      id: 'dataset',
      entries: [],
      default: 0
    },
    value: 0
  };

  function onDatasetChange(index: number) {
    datasetPropertyState.value = index;
  }

  let globalState: {
    datasetID: string;
    attributes: GUISelectPropertyState;
    channels: Record<string, GUIChannelPropertyState[]>;
  }[] = [];

  function onInitialize(
    event: CustomEvent<GUIEvent<ImagePanelInitializationEvent>>
  ) {
    if (event.detail.target !== 'image-panel') {
      return;
    }

    event.stopPropagation();
    const payload = event.detail.props;

    const channelEntry = {};
    for (const [attribute, channels] of Object.entries(payload.channels)) {
      channelEntry[attribute] = channels.map(x => {
        return {
          property: x,
          valueMin: x.defaultMin,
          valueMax: x.defaultMax,
          color: x.color.repeat(1),
          visible: x.visible
        } as GUIChannelPropertyState;
      });
    }

    globalState.push({
      datasetID: event.detail.props.id,
      attributes: { property: payload.attribute, value: 0 },
      channels: channelEntry
    });

    datasetPropertyState.property.entries.push({
      value: datasetPropertyState.property.entries.length,
      name: payload.name
    });
    datasetPropertyState = { ...datasetPropertyState };
  }

  $: currentState = globalState[datasetPropertyState.value];
  $: currentAttribute = currentState?.attributes.property.entries.find(
    x => x.value === currentState.attributes.value
  ).name;

  onMount(() => {
    window.addEventListener(Events.INITIALIZE, onInitialize, {
      capture: true
    });
  });

  onDestroy(() => {
    window.removeEventListener(Events.INITIALIZE, onInitialize, {
      capture: true
    });
  });
</script>

<div class="Viewer-ImagePanel">
  <div class="Viewer-ImagePanel__header">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="icon"
      viewBox="0 0 48 48"
      stroke-width="1.5"
      stroke="currentColor"
      fill="none"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M12.9446 12.5906H35.8816V35.7486H12.9446V12.5906Z"></path><path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M4.41309 44.1692V4.16919H44.4131V44.1692H4.41309ZM8.67938 39.9584H40.1468V8.37994H8.67938V39.9584Z"
      ></path>
    </svg>
    Image
  </div>
  <div class="Viewer-ImagePanel__main">
    {#if datasetPropertyState.property.entries.length === 0}
      No Image assets found
    {:else}
      <Select state={datasetPropertyState} callback={onDatasetChange} />
      <Select state={currentState.attributes} />
      <div class="Viewer-ImagePanel__channels">
        {#each currentState.channels[currentAttribute] as channel}
          <ChannelIntensitySlider state={channel} dataset={currentState.datasetID}/>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style lang="scss">
  .Viewer-ImagePanel {
    background: var(--viewer-surface-primary);
    display: flex;
    flex-direction: column;
    font-size: 14px;
    font-family: Inter, Arial, 'sans-serif';
    color: var(--viewer-text-primary);
    fill: var(--viewer-text-primary);
    gap: 12px;

    &__header {
      border-bottom: 1px solid var(--viewer-border);
      vertical-align: middle;
      line-height: 28px;
      padding: 6px 20px;
      font-weight: 600;
      font-size: 14px;
      display: flex;

      svg {
        margin-right: 10px;
        width: 24px;
        height: 24px;
      }
    }

    &__main {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    &__channels {
      border-top: 1px solid var(--viewer-border);
      padding-top: 12px;
      margin-top: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
  }
</style>

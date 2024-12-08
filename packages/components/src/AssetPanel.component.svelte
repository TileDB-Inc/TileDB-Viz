<svelte:options
  customElement={{
    tag: 'asset-panel'
  }}
/>

<script lang="ts">
  import { onMount } from 'svelte';
  import CameraPanel from './CameraPanel.component.svelte';
  import ScenePanel from './ScenePanel.component.svelte';
  import TilePanel from './TilePanel.component.svelte';
  import PointPanel from './PointPanel.component.svelte';
  import GeometryPanel from './GeometryPanel.component.svelte';
  import OptionsPanel from './OptionsPanel.component.svelte';
  import ImagePanel from './ImagePanel.component.svelte';

  let expandableWindowsState: Record<
    string,
    { active: boolean; width: number; reference: any }
  > = {
    'camera-panel': { active: false, width: 0, reference: undefined },
    'scene-panel': { active: false, width: 0, reference: undefined },
    'image-panel': { active: false, width: 0, reference: undefined },
    'geometry-panel': { active: false, width: 0, reference: undefined },
    'point-panel': { active: false, width: 0, reference: undefined },
    'tile-panel': { active: false, width: 0, reference: undefined },
    'options-panel': { active: false, width: 0, reference: undefined }
  };

  onMount(() => {
    for (const value of Object.values(expandableWindowsState)) {
      if (value.reference === undefined) continue;
      value.width = value.reference.scrollWidth;
    }
  });

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
</script>

<div class="Viewer-SelectionPanel">
  <div class="anchor-top">
    <button
      title="Camera"
      class="Viewer-SelectionPanel__option"
      class:selected={expandableWindowsState['camera-panel'].active}
      on:click={() => expandableWindowOnChange('camera-panel')}
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
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <path
          d="M5 7h1a2 2 0 0 0 2 -2a1 1 0 0 1 1 -1h6a1 1 0 0 1 1 1a2 2 0 0 0 2 2h1a2 2 0 0 1 2 2v9a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-9a2 2 0 0 1 2 -2"
        />
        <path d="M9 13a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />
      </svg>
    </button>
    <button
      title="Scene"
      class="Viewer-SelectionPanel__option"
      class:selected={expandableWindowsState['scene-panel'].active}
      on:click={() => expandableWindowOnChange('scene-panel')}
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
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <path d="M15 8h.01" />
        <path d="M6 13l2.644 -2.644a1.21 1.21 0 0 1 1.712 0l3.644 3.644" />
        <path d="M13 13l1.644 -1.644a1.21 1.21 0 0 1 1.712 0l1.644 1.644" />
        <path d="M4 8v-2a2 2 0 0 1 2 -2h2" />
        <path d="M4 16v2a2 2 0 0 0 2 2h2" />
        <path d="M16 4h2a2 2 0 0 1 2 2v2" />
        <path d="M16 20h2a2 2 0 0 0 2 -2v-2" />
      </svg>
    </button>
    <div class="separator"></div>

    <button
      title="Image Layers"
      class="Viewer-SelectionPanel__option"
      class:selected={expandableWindowsState['image-panel'].active}
      on:click={() => expandableWindowOnChange('image-panel')}
    >
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
    </button>
    <button
      title="Polygon Layers"
      class="Viewer-SelectionPanel__option"
      class:selected={expandableWindowsState['geometry-panel'].active}
      on:click={() => expandableWindowOnChange('geometry-panel')}
    >
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
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M46.3289 24.6851L29.2878 41.7261C29.1234 41.8906 28.9589 41.9453 28.7398 41.9453L19.6441 42C19.4249 42 19.2057 41.8903 19.096 41.7808L1.67123 24.3561C1.39735 24.0272 1.39735 23.5888 1.67123 23.2602L18.7123 6.21917C18.8767 6.10942 19.0412 6 19.2604 6H28.356C28.5752 6 28.7944 6.10974 28.9041 6.21917L46.3289 23.6439C46.6028 23.9178 46.6028 24.4112 46.3289 24.6851ZM25.9454 8.46618H21.6715L23.8085 10.5484L25.9454 8.46618ZM25.8907 35.6985L28.9044 38.7122L42.2193 25.3972H36.1919L25.8907 35.6985ZM25.5618 12.3017L36.1924 22.9322H42.2197L28.5211 9.28831L25.5618 12.3017ZM14.0006 23.8083L24.1927 33.9449L34.0011 24.1911L23.809 13.999L14.0006 23.8074V23.8083ZM5.78154 22.6027H11.8089L22.1104 12.3011L19.0968 9.28749L5.78154 22.6027ZM22.0551 39.5343H26.3291L24.1921 37.3973L22.0551 39.5343ZM22.4388 35.6987L11.8082 25.0134H5.78087L19.4795 38.7121L22.4388 35.6987Z"
        />
      </svg>
    </button>
    <button
      title="Point Cloud Layers"
      class="Viewer-SelectionPanel__option"
      class:selected={expandableWindowsState['point-panel'].active}
      on:click={() => expandableWindowOnChange('point-panel')}
    >
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
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M24 4.01001C24.6562 4.01001 25.2706 4.33177 25.6443 4.87153L43.6444 30.8713C43.9658 31.3357 44.076 31.9139 43.9477 32.464C43.8198 33.0138 43.4649 33.4839 42.9714 33.7582L24.9713 43.7585C24.3673 44.094 23.6327 44.094 23.0287 43.7585L5.02865 33.7582C4.53512 33.4839 4.18055 33.0138 4.05228 32.464C3.92404 31.9139 4.0342 31.3357 4.35563 30.8713L22.3557 4.87153C22.7293 4.33179 23.3437 4.01001 24 4.01001ZM8.90053 31.3332L21.9994 38.6105V12.4119L8.90053 31.3332ZM25.9997 12.4117V38.6104L39.0986 31.333L25.9997 12.4117Z"
        />
      </svg>
    </button>
    <button
      title="3D Tile Layers"
      class="Viewer-SelectionPanel__option"
      class:selected={expandableWindowsState['tile-panel'].active}
      on:click={() => expandableWindowOnChange('tile-panel')}
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
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <path
          d="M3 7a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2z"
        />
        <path d="M7 9h1.5a1.5 1.5 0 0 1 0 3h-.5h.5a1.5 1.5 0 0 1 0 3h-1.5" />
        <path d="M14 9v6h1a2 2 0 0 0 2 -2v-2a2 2 0 0 0 -2 -2z" />
      </svg>
    </button>
    <div class="separator"></div>
  </div>

  <div class="anchor-bottom">
    <button 
      title="Settings"
      class="Viewer-SelectionPanel__option"
      class:selected={expandableWindowsState['options-panel'].active}
      on:click={() => expandableWindowOnChange('options-panel')}
      >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="icon"
        viewBox="0 0 48 48"
        stroke-width="2"
        stroke="currentColor"
        fill="none"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path
          d="M26.1271 4.27897C27.2225 4.27897 28.1187 5.15572 28.1187 6.2716V8.76238C29.5806 9.14098 30.9468 9.71884 32.2294 10.4561L33.9821 8.68267C34.7588 7.88562 36.0135 7.88562 36.7903 8.68267L39.5985 11.4923C40.3752 12.2694 40.3752 13.5248 39.5985 14.3019L37.8259 16.0554C38.5628 17.3108 39.1404 18.7056 39.5188 20.1602L42.0084 20.1403C43.1038 20.1403 44 21.017 44 22.1329V26.1182C44 27.2141 43.1038 28.1108 42.0084 28.1108H39.4989C39.1205 29.5455 38.5429 30.9204 37.7861 32.2236L39.5387 33.9771C40.3155 34.7542 40.3155 36.0096 39.5387 36.7867L36.7106 39.5963C35.914 40.3734 34.6592 40.3734 33.8825 39.5963L32.1099 37.8229C30.8154 38.5801 29.4411 39.138 27.9992 39.5166V42.0074C27.9992 43.1033 27.103 44 26.0076 44H22.0243C20.909 44 20.0327 43.1033 20.0327 42.0074V39.4967C18.5788 39.1181 17.2045 38.5402 15.91 37.783L14.1374 39.5365H14.1175C13.3209 40.3136 12.0661 40.3136 11.2894 39.5365L8.46126 36.707C7.66461 35.9099 7.66461 34.6546 8.45927 33.8775L10.2119 32.104C9.43517 30.8088 8.87751 29.4339 8.4991 27.9912H5.99164C4.87632 27.9912 4 27.0946 4 25.9986V22.0134C4 20.8975 4.87632 20.0207 5.99164 20.0207H8.48118C8.83967 18.5581 9.43716 17.1713 10.1741 15.9079L8.40151 14.1345C7.60486 13.3375 7.60486 12.0821 8.40151 11.305L11.2097 8.46348C11.9865 7.66643 13.2412 7.66643 14.0179 8.46348L15.7706 10.217C17.0452 9.43987 18.4194 8.88194 19.8733 8.50334L19.8534 5.99263C19.8534 4.87676 20.7297 4 21.845 4H25.8283L26.1271 4.27897ZM24.1354 16.2347C19.7339 16.2347 16.1689 19.8015 16.1689 24.2052C16.1689 28.589 19.7339 32.1758 24.1354 32.1758C28.517 32.1758 32.102 28.589 32.102 24.2052C32.102 19.8015 28.517 16.2347 24.1354 16.2347Z"
        >
        </path>
      </svg>
    </button>
  </div>
</div>

<div
  bind:this={expandableWindowsState['camera-panel'].reference}
  class="Viewer-SelectionPanel__container"
  style="max-width: {expandableWindowsState['camera-panel'].active
    ? expandableWindowsState['camera-panel'].width
    : 0}px; transition: 0.8s max-width; overflow: hidden;"
>
  <div
    class="Viewer-SelectionPanel__sidewindow"
    style="--expanded-width: 400px"
  >
    <CameraPanel></CameraPanel>
  </div>
</div>

<div
  bind:this={expandableWindowsState['scene-panel'].reference}
  class="Viewer-SelectionPanel__container"
  style="max-width: {expandableWindowsState['scene-panel'].active
    ? expandableWindowsState['scene-panel'].width
    : 0}px; transition: 0.8s max-width; overflow: hidden;"
>
  <div
    class="Viewer-SelectionPanel__sidewindow"
    style="--expanded-width: 400px"
  >
    <ScenePanel></ScenePanel>
  </div>
</div>

<div
  bind:this={expandableWindowsState['image-panel'].reference}
  class="Viewer-SelectionPanel__container"
  style="max-width: {expandableWindowsState['image-panel'].active
    ? expandableWindowsState['image-panel'].width
    : 0}px; transition: 0.8s max-width; overflow: hidden;"
>
  <div
    class="Viewer-SelectionPanel__sidewindow"
    style="--expanded-width: 400px"
  >
    <ImagePanel></ImagePanel>
  </div>
</div>

<div
  bind:this={expandableWindowsState['geometry-panel'].reference}
  class="Viewer-SelectionPanel__container"
  style="max-width: {expandableWindowsState['geometry-panel'].active
    ? expandableWindowsState['geometry-panel'].width
    : 0}px; transition: 0.8s max-width; overflow: hidden;"
>
  <div
    class="Viewer-SelectionPanel__sidewindow"
    style="--expanded-width: 400px"
  >
    <GeometryPanel></GeometryPanel>
  </div>
</div>

<div
  bind:this={expandableWindowsState['point-panel'].reference}
  class="Viewer-SelectionPanel__container"
  style="max-width: {expandableWindowsState['point-panel'].active
    ? expandableWindowsState['point-panel'].width
    : 0}px; transition: 0.8s max-width; overflow: hidden;"
>
  <div
    class="Viewer-SelectionPanel__sidewindow"
    style="--expanded-width: 400px"
  >
    <PointPanel></PointPanel>
  </div>
</div>

<div
  bind:this={expandableWindowsState['tile-panel'].reference}
  class="Viewer-SelectionPanel__container"
  style="max-width: {expandableWindowsState['tile-panel'].active
    ? expandableWindowsState['tile-panel'].width
    : 0}px; transition: 0.8s max-width; overflow: hidden;"
>
  <div
    class="Viewer-SelectionPanel__sidewindow"
    style="--expanded-width: 400px"
  >
    <TilePanel></TilePanel>
  </div>
</div>

<div
  bind:this={expandableWindowsState['options-panel'].reference}
  class="Viewer-SelectionPanel__container"
  style="max-width: {expandableWindowsState['options-panel'].active
    ? expandableWindowsState['options-panel'].width
    : 0}px; transition: 0.8s max-width; overflow: hidden;"
>
  <div
    class="Viewer-SelectionPanel__sidewindow"
    style="--expanded-width: 400px"
  >
    <OptionsPanel></OptionsPanel>
  </div>
</div>

<style lang="scss">
  .Viewer-SelectionPanel {
    position: absolute;
    top: 0;
    right: 0;
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
      right: 48px;
      z-index: 1;
    }

    &__sidewindow {
      width: var(--expanded-width);
      background-color: var(--viewer-surface-primary);
      box-shadow: var(--viewer-shadow-small);
      overflow-y: auto;
      padding: 16px 10px;
      max-height: calc(100vh - 32px);
      border-left: 1px solid var(--viewer-border-disabled, #e6e6e6);
      border-radius: 8px 0px 0px 8px;
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

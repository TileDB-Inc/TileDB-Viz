<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Events } from './constants/events';
  import { GUIEvent, GUISliderPropertyState, SliderProps } from './types';

  export let state: GUISliderPropertyState;

  function zoomInfoUpdate(e) {
    if (e.detail.type === 'ZOOM_INFO') {
      state.value = e.detail.zoom;
    }
  }

  function onClick() {
    window.dispatchEvent(
      new CustomEvent<GUIEvent<SliderProps>>(Events.SLIDER_CHANGE, {
        bubbles: true,
        detail: {
          target: 'camera_zoom',
          props: {
            value: state.value
          }
        }
      })
    );
  }

  onMount(() => {
    window.addEventListener(Events.ENGINE_INFO_UPDATE, zoomInfoUpdate, {
      capture: true
    });
  });

  onDestroy(() => {
    window.removeEventListener(Events.ENGINE_INFO_UPDATE, zoomInfoUpdate, {
      capture: true
    });
  });
</script>

<div class="Viewer-ZoomControl__content">
  <div class="Viewer-ZoomControl__group">
    <button
      class="Viewer-ZoomControl__button"
      on:click={() => {state.value = Math.min(state.value + state.property.step, state.property.max); onClick()}}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M10.0261 18.3333C10.2671 18.3333 10.4851 18.2732 10.6803 18.1529C10.8754 18.0325 11.034 17.8776 11.156 17.6881C11.2749 17.4986 11.3344 17.2941 11.3344 17.0745V11.2949H17.0524C17.2811 11.2949 17.493 11.2362 17.6882 11.1189C17.8834 11.0016 18.0404 10.8452 18.1593 10.6497C18.2752 10.4542 18.3332 10.2376 18.3332 9.99999C18.3332 9.76538 18.2737 9.55182 18.1548 9.35931C18.0358 9.1638 17.8773 9.00589 17.679 8.88557C17.4808 8.76526 17.2673 8.7051 17.0386 8.7051H11.3161V2.93448C11.3161 2.70588 11.2551 2.49683 11.1331 2.30734C11.0112 2.11483 10.851 1.95992 10.6528 1.84262C10.4546 1.72531 10.235 1.66666 9.99412 1.66666C9.76235 1.66666 9.54736 1.72381 9.34914 1.83811C9.14786 1.95241 8.98776 2.10581 8.86883 2.29831C8.7499 2.48781 8.69043 2.69535 8.69043 2.92095V8.68705H2.95876C2.73309 8.68705 2.52343 8.74571 2.32979 8.86301C2.13156 8.98032 1.97146 9.13673 1.84948 9.33224C1.7275 9.52475 1.6665 9.7368 1.6665 9.96841C1.6665 10.206 1.72597 10.4211 1.8449 10.6136C1.96384 10.8061 2.12241 10.961 2.32064 11.0783C2.51581 11.1926 2.72547 11.2498 2.94961 11.2498H8.67671V17.0249C8.67671 17.2445 8.73465 17.4475 8.85053 17.634C8.96641 17.8205 9.12499 17.9739 9.32626 18.0942C9.52449 18.2115 9.73796 18.2702 9.96667 18.2702L10.0261 18.3333Z"
          fill="var(--viewer-text-primary)"
          fill-opacity="0.7"
        />
      </svg>
    </button>
    <button
      class="Viewer-ZoomControl__button"
      on:click={() => {state.value = Math.max(state.value - state.property.step, state.property.min); onClick()}}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g clip-path="url(#clip0_1047_1250)">
          <path
            d="M2.95613 11.3093H17.0435C17.2733 11.3093 17.4865 11.2502 17.6834 11.1321C17.8803 11.014 18.0378 10.8565 18.156 10.6596C18.2741 10.4627 18.3332 10.2428 18.3332 9.99999C18.3332 9.76372 18.2741 9.54714 18.156 9.35025C18.0378 9.15336 17.8803 8.99421 17.6834 8.8728C17.4865 8.75138 17.2733 8.69067 17.0435 8.69067H2.95613C2.73299 8.69067 2.52297 8.75138 2.32608 8.8728C2.12919 8.99421 1.97004 9.15336 1.84863 9.35025C1.72721 9.54714 1.6665 9.76372 1.6665 9.99999C1.6665 10.2428 1.72721 10.4627 1.84863 10.6596C1.97004 10.8565 2.12919 11.014 2.32608 11.1321C2.52297 11.2502 2.73299 11.3093 2.95613 11.3093Z"
            fill="var(--viewer-text-primary)"
            fill-opacity="0.7"
          />
        </g>
        <defs>
          <clipPath id="clip0_1047_1250">
            <rect
              width="16.6667"
              height="2.61863"
              fill="var(--viewer-text-primary)"
              transform="translate(1.6665 8.6907)"
            />
          </clipPath>
        </defs>
      </svg>
    </button>
    <p class="Viewer-ZoomControl__label">
      {(100 * 2 ** state.value).toFixed(0) + ' %'}
    </p>
  </div>
  <div class="Viewer-ZoomControl__group">
    <p class="Viewer-ZoomControl__label">Reset view</p>
    <button
      class="Viewer-ZoomControl__button"
      on:click={() => {state.value = state.property.default; onClick()}}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M7.86565 6.29913C8.15493 6.18786 8.48455 6.10581 8.85449 6.05296C9.22444 6.00011 9.63194 5.97368 10.077 5.97368C10.8558 5.97368 11.5818 6.11972 12.255 6.41178C12.9281 6.70385 13.5178 7.10717 14.024 7.62176C14.5303 8.13635 14.9267 8.73439 15.2132 9.41587C15.4997 10.0974 15.6429 10.8331 15.6429 11.623C15.6429 12.4075 15.4983 13.1404 15.209 13.8219C14.9197 14.5034 14.5178 15.1014 14.0032 15.616C13.4886 16.1306 12.8919 16.5325 12.2132 16.8218C11.5345 17.1111 10.8058 17.2557 10.0269 17.2557C9.24808 17.2557 8.51792 17.1111 7.83644 16.8218C7.15495 16.5325 6.55691 16.1306 6.04233 15.616C5.52774 15.1014 5.1258 14.5034 4.83652 13.8219C4.54723 13.1404 4.40259 12.4074 4.40259 11.623C4.40259 11.3393 4.31636 11.1057 4.1439 10.9221C3.97145 10.7385 3.74614 10.6467 3.46798 10.6467C3.18983 10.6467 2.95896 10.7385 2.77538 10.9221C2.59179 11.1057 2.5 11.3393 2.5 11.623C2.5 12.6689 2.69471 13.648 3.08413 14.5604C3.47355 15.4727 4.01179 16.2738 4.69883 16.9637C5.38588 17.6535 6.18558 18.1931 7.09794 18.5825C8.01029 18.972 8.98662 19.1667 10.0269 19.1667C11.0672 19.1667 12.0436 18.972 12.9559 18.5825C13.8683 18.1931 14.668 17.6535 15.355 16.9637C16.0421 16.2738 16.5803 15.4727 16.9697 14.5604C17.3592 13.648 17.5539 12.6689 17.5539 11.623C17.5539 10.5827 17.3619 9.60919 16.9781 8.7024C16.5942 7.79561 16.0602 7.00008 15.3759 6.31582C14.6916 5.63155 13.8975 5.0961 12.9935 4.70946C12.0895 4.32282 11.1173 4.12951 10.077 4.12951C9.57632 4.12951 9.07286 4.18096 8.56661 4.28388C8.06037 4.3868 7.57638 4.53283 7.11463 4.72198L7.86565 6.29913ZM10.2189 9.69542C10.4748 9.69542 10.6931 9.60502 10.8739 9.42422C11.0547 9.24342 11.1451 9.02228 11.1451 8.76082C11.1451 8.63286 11.1215 8.51743 11.0742 8.41451C11.0269 8.31159 10.9615 8.21841 10.8781 8.13496L7.97412 5.27273L10.8864 2.41884C10.9643 2.32982 11.0269 2.23386 11.0742 2.13094C11.1215 2.02802 11.1451 1.91259 11.1451 1.78464C11.1451 1.51761 11.0547 1.2923 10.8739 1.10872C10.6931 0.925135 10.4748 0.833344 10.2189 0.833344C9.95182 0.833344 9.73486 0.925135 9.56797 1.10872L6.14664 4.58846C5.94637 4.78873 5.84623 5.0196 5.84623 5.28107C5.84623 5.41459 5.87126 5.53976 5.92133 5.65658C5.9714 5.77341 6.0465 5.88189 6.14664 5.98203L9.56797 9.43673C9.73486 9.60919 9.95182 9.69542 10.2189 9.69542L10.2189 9.69542Z"
          fill="var(--viewer-text-primary)"
          fill-opacity="0.7"
        />
      </svg>
    </button>
  </div>
</div>

<style lang="scss">
  .Viewer-ZoomControl {
    align-items: center;
    gap: 8px;
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

    &__label {
      font-family: Inter, Arial, 'sans-serif';
      flex: 1;
      font-size: 12px;
      font-weight: 600;
      color: var(--viewer-text-primary);
      line-height: 20px;
      width: 56px;
      text-align: center;
      margin: 0;
      white-space: nowrap;
    }

    &__button {
      background: no-repeat;
      border: none;
      width: 28px;
      height: 28px;
      padding: 0;

      &:hover {
        cursor: pointer;
      }
    }

    &__content {
      display: flex;
      gap: 8px;
    }

    &__group {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px;
      flex: 1;
      border-radius: 8px;
      box-shadow: var(--viewer-shadow-small);
      margin: 2px;
    }
  }
</style>

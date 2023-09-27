<svelte:options customElement="channel-panel" />

<script lang="typescript">
  import Section from './Section.component.svelte';
  import Slider from './Slider.component.svelte';
  import { rgbToHex, hexToRgb } from './utils/helpers';
  import { Events } from './constants/events';
  import { ButtonProps, GUIEvent } from './types';

  export let channels = '[]';
  $: visibility = JSON.parse(channels).map(x => x.visible);

  function onColorChange(event: Event, index: number) {
    window.dispatchEvent(
      new CustomEvent<GUIEvent<ButtonProps>>(Events.COLOR_CHANGE, {
        bubbles: true,
        detail: {
          target: `channel_${index}`,
          props: {
            command: 'color',
            data: hexToRgb((event.target as HTMLInputElement).value)
          }
        }
      })
    );
  }

  function onVisibilityChange(event: Event, index: number) {
    visibility[index] = !visibility[index];

    window.dispatchEvent(
      new CustomEvent<GUIEvent<ButtonProps>>(Events.TOGGLE_INPUT_CHANGE, {
        bubbles: true,
        detail: {
          target: `channel_${index}`,
          props: {
            command: 'visibility',
            data: visibility[index]
          }
        }
      })
    );
  }
</script>

<Section>
  <div slot="header" class="Viewer-ControlPanel__title">
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M16.4345 7.15856C16.4366 7.08693 16.4452 7.01702 16.4452 6.94482C16.4452 3.39122 13.554 0.5 10.0004 0.5C6.4468 0.5 3.55558 3.39108 3.55558 6.94482C3.55558 7.01702 3.56416 7.08708 3.5663 7.15856C1.45553 8.21837 0 10.3982 0 12.9164C0 16.4704 2.89122 19.3612 6.44482 19.3612C7.75842 19.3612 8.98034 18.9642 10 18.287C11.0198 18.9642 12.2416 19.3612 13.5552 19.3612C17.1092 19.3612 20 16.47 20 12.9164C20.0009 10.3983 18.5456 8.21848 16.4345 7.15856ZM10.0003 17.1041C8.85498 16.1304 8.11655 14.6973 8.06582 13.0917C8.67685 13.2844 9.3265 13.3894 10.0006 13.3894C10.6744 13.3894 11.324 13.2844 11.9351 13.092C11.8837 14.6972 11.1452 16.1304 10.0003 17.1041V17.1041ZM7.23146 11.6878C5.8238 10.8625 4.81732 9.43231 4.568 7.7544C5.15487 7.54023 5.78508 7.41729 6.44516 7.41729C7.45351 7.41729 8.39665 7.69478 9.21015 8.17087C8.21153 9.08645 7.49926 10.3066 7.2315 11.6877L7.23146 11.6878ZM10.7905 8.17105C11.604 7.69526 12.5468 7.41746 13.5559 7.41746C14.2158 7.41746 14.8462 7.54042 15.4331 7.75458C15.1836 9.43245 14.1771 10.8627 12.7693 11.6879C12.5011 10.307 11.7891 9.08651 10.7905 8.17108L10.7905 8.17105ZM10.0003 1.44587C12.9734 1.44587 15.3969 3.81899 15.4902 6.76929C14.8792 6.57657 14.2296 6.47163 13.5555 6.47163C12.2419 6.47163 11.02 6.86866 10.0003 7.54616C8.98023 6.86848 7.75872 6.47163 6.44512 6.47163C5.77132 6.47163 5.12139 6.57657 4.51035 6.76929C4.60371 3.81917 7.02731 1.44587 10.0003 1.44587ZM6.44512 18.4156C3.41306 18.4156 0.946395 15.9489 0.946395 12.9169C0.946395 10.8951 2.04654 9.12923 3.67651 8.17398C4.06179 10.1608 5.36353 11.8201 7.12203 12.7028C7.11988 12.7747 7.11131 12.8444 7.11131 12.917C7.11131 14.7953 7.92422 16.4836 9.21037 17.6625C8.39676 18.138 7.45359 18.4158 6.44523 18.4158L6.44512 18.4156ZM13.5553 18.4156C12.5466 18.4156 11.6038 18.1379 10.7899 17.6621C12.0764 16.483 12.889 14.7948 12.889 12.9166C12.889 12.8444 12.8808 12.7743 12.8782 12.7028C14.6367 11.8199 15.9384 10.1604 16.324 8.17362C17.9543 9.12905 19.0541 10.8949 19.0541 12.9166C19.0546 15.9488 16.5878 18.4157 13.5554 18.4157L13.5553 18.4156Z"
        fill="url(#paint0_linear_747_3291)"
      />
      <defs>
        <linearGradient
          id="paint0_linear_747_3291"
          x1="10"
          y1="0.5"
          x2="10"
          y2="19.3612"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FF0909" />
          <stop offset="0.505208" stopColor="#00FF00" />
          <stop offset="1" stopColor="#0000FF" />
        </linearGradient>
      </defs>
    </svg>
    Channel Blending
  </div>
  <ul class="Viewer-ControlPanel__list" slot="content">
    {#each JSON.parse(channels) as channel, index}
      <li class="Viewer-ControlPanel__item">
        <div class="Viewer-ControlPanel__options">
          <input type="color" value="{rgbToHex(channel.color[0], channel.color[1], channel.color[2])}" on:input={(e) => onColorChange(e, index)}/>
          <button class="Viewer-ControlPanel__icon-wrapper" on:click={(e) => onVisibilityChange(e, index)}>
            {#if visibility[index]}
              <svg
                class="Viewer-ControlPanel__icon"
                width="48"
                height="48"
                viewBox="0 0 48 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <title>Hide channel</title>
                <path
                  d="M24 8C29.908 8 35.054 11.054 39 15C41.922 17.922 44 22.044 44 24C44 25.956 41.922 30.078 39 33C35.054 36.946 29.908 40 24 40C18.092 40 12.946 36.946 9 33C5.054 29.054 4 25.956 4 24C4 22.044 6.078 17.922 9 15C12.946 11.054 18.092 8 24 8ZM24 14C21.3478 14 18.8043 15.0536 16.9289 16.9289C15.0536 18.8043 14 21.3478 14 24C14 26.6522 15.0536 29.1957 16.9289 31.0711C18.8043 32.9464 21.3478 34 24 34C26.6522 34 29.1957 32.9464 31.0711 31.0711C32.9464 29.1957 34 26.6522 34 24C34 21.3478 32.9464 18.8043 31.0711 16.9289C29.1957 15.0536 26.6522 14 24 14ZM24 18.5C25.4587 18.5 26.8576 19.0795 27.8891 20.1109C28.9205 21.1424 29.5 22.5413 29.5 24C29.5 25.4587 28.9205 26.8576 27.8891 27.8891C26.8576 28.9205 25.4587 29.5 24 29.5C22.5413 29.5 21.1424 28.9205 20.1109 27.8891C19.0795 26.8576 18.5 25.4587 18.5 24C18.5 22.5413 19.0795 21.1424 20.1109 20.1109C21.1424 19.0795 22.5413 18.5 24 18.5Z"
                  fill="var(--viewer-text-tertiary)"
                />
              </svg>
            {:else}
              <svg
                class="Viewer-ControlPanel__icon"
                width="48"
                height="48"
                viewBox="0 0 48 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <title>Show channel</title>
                <path
                  d="M42.12 5.87936C42.6452 6.4041 42.9572 7.10495 42.9956 7.84638C43.034 8.58781 42.7962 9.31715 42.328 9.89336L42.122 10.1214L10.122 42.1214C9.57953 42.6719 8.84553 42.9918 8.07299 43.0144C7.30045 43.037 6.54898 42.7606 5.97522 42.2428C5.40145 41.725 5.04966 41.0058 4.99317 40.235C4.93668 39.4642 5.17986 38.7013 5.672 38.1054L5.878 37.8774L9.898 33.8614C9.592 33.5794 9.292 33.2914 9 32.9994C5.054 29.0534 4 25.9554 4 23.9994C4 22.0434 6.078 17.9214 9 14.9994C12.946 11.0534 18.092 7.99936 24 7.99936C27.342 7.99936 30.44 8.97736 33.216 10.5394L37.878 5.87936C38.1566 5.60058 38.4874 5.37943 38.8515 5.22855C39.2156 5.07766 39.6059 5 40 5C40.3941 5 40.7844 5.07766 41.1485 5.22855C41.5126 5.37943 41.8434 5.60058 42.122 5.87936H42.12ZM40.956 17.2854C42.806 19.7914 44 22.5194 44 23.9994C44 25.9554 41.922 30.0774 39 32.9994C35.054 36.9454 29.908 39.9994 24 39.9994C22.26 39.9994 20.582 39.7334 18.984 39.2594L24.246 33.9934L24.434 33.9894C26.9655 33.8792 29.3608 32.812 31.1358 31.0037C32.9107 29.1953 33.933 26.7805 33.996 24.2474L40.956 17.2874V17.2854ZM24 13.9994C22.2806 13.999 20.5901 14.4419 19.0919 15.2854C17.5936 16.1289 16.3381 17.3445 15.4467 18.8147C14.5552 20.285 14.0579 21.9603 14.0028 23.6788C13.9477 25.3973 14.3366 27.101 15.132 28.6254L18.618 25.1374C18.4283 24.2413 18.4653 23.312 18.7258 22.4339C18.9863 21.5558 19.462 20.7566 20.1096 20.109C20.7573 19.4613 21.5564 18.9857 22.4346 18.7252C23.3127 18.4647 24.2419 18.4276 25.138 18.6174L28.626 15.1314C27.1983 14.3853 25.6109 13.9969 24 13.9994Z"
                  fill="var(--viewer-text-tertiary)"
                />
              </svg>
            {/if}
          </button>
        </div>
        <Slider
            id={`channel_${index}`}
            label={channel.name}
            value={channel.intensity}
            min={channel.min}
            max={channel.max}
          />
      </li>
    {/each}
  </ul>
</Section>

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

    &__options {
      display: flex;
      flex-direction: column;
      justify-content: space-evenly;
    }

    &__icon {
      height: auto;
      width: 20px;
    }

    &__icon-wrapper {
      background: none;
      border: none;
      padding: 0;
      margin: 0 8px 0;
      cursor: pointer;
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

      input[type='color'] {
        cursor: pointer;
        -webkit-appearance: none;
        padding: 0;
        border: none;
        border-radius: 10px;
        width: 18px;
        height: 18px;
        margin: 0  auto;
      }

      input[type='color']::-webkit-color-swatch {
        border: none;
        border-radius: 10px;
        padding: 0;
      }

      input[type='color']::-webkit-color-swatch-wrapper {
        border: none;
        border-radius: 10px;
        padding: 0;
      }
    }
  }
</style>

<svelte:options tag="group-panel" />

<script>
  import { onMount } from 'svelte';
  import Section from './Section.component.svelte';
  import Sliderr from './Sliderr.component.svelte';
  import { rangeToPagination } from './utils/capitalize';

  export let groups = ['asd', 'addd', 'sd bd'];
  export let itemsPerPage = 5;

  onMount(async () => {
    filteredGroups = groups;
  });

  function filterGroups(e) {
    let searchTerm = e.target.value.toLowerCase();
    filteredGroups = groups.filter(
      item => item.toLowerCase().includes(searchTerm) || searchTerm === ''
    );
  }

  function onNext() {
    currentPage = Math.min(currentPage + 1, pages - 1);
  }

  function onPrevious() {
    currentPage = Math.max(0, currentPage - 1);
  }

  let filteredGroups = [...groups];
  let pages = Math.ceil(filteredGroups.length / itemsPerPage);
  let currentPage = 0;
</script>

<section-menu id={'group-panel'} class="Viewer-GroupSelector">
  <div slot="header" class="Viewer-GroupSelector__title">
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4.73518 20.1672H19.5261C20.3101 20.1672 20.9184 19.9422 21.3511 19.4921C21.7837 19.0421 22 18.367 22 17.4669V8.29442C22 7.40012 21.7721 6.72793 21.3162 6.27787C20.8603 5.82781 20.1765 5.60279 19.2648 5.60279H10.7892C10.493 5.60279 10.2448 5.56359 10.0444 5.48519C9.84408 5.40679 9.63357 5.27468 9.41289 5.08885L8.88153 4.6446C8.6899 4.482 8.50407 4.35424 8.32404 4.26132C8.14402 4.16841 7.94948 4.10163 7.74042 4.06098C7.53136 4.02033 7.28455 4 7 4H4.40418C3.63763 4 3.0453 4.21777 2.62718 4.65331C2.20906 5.08885 2 5.74797 2 6.63066V17.4669C2 18.367 2.22793 19.0421 2.6838 19.4922C3.13966 19.9422 3.82346 20.1673 4.73519 20.1673L4.73518 20.1672ZM4.7526 18.7648C4.31706 18.7648 3.98314 18.6501 3.75086 18.4207C3.51857 18.1913 3.40242 17.8502 3.40242 17.3972V6.70034C3.40242 6.27061 3.51276 5.94685 3.73343 5.72908C3.95411 5.51131 4.2735 5.40243 4.69162 5.40243H6.63413C6.92449 5.40243 7.1713 5.44163 7.37455 5.52002C7.5778 5.59842 7.78977 5.73344 8.01044 5.92508L8.5418 6.36062C8.72763 6.51741 8.91056 6.64227 9.09058 6.73518C9.27061 6.8281 9.4666 6.89633 9.67857 6.93988C9.89053 6.98344 10.1417 7.00522 10.4321 7.00522H19.2474C19.6771 7.00522 20.0096 7.11991 20.2448 7.34929C20.48 7.57868 20.5976 7.91985 20.5976 8.37281V17.4059C20.5976 17.8531 20.48 18.1913 20.2448 18.4207C20.0096 18.6501 19.6771 18.7648 19.2474 18.7648L4.7526 18.7648ZM2.85364 10.2108H21.1463V8.89544H2.85364V10.2108Z"
        fill="var(--viewer-text-disabled)"
      />
    </svg>
    Group Browser
  </div>
  <div class="Viewer-GroupSelector__content" slot="content">
    <input
      class="Viewer-GroupSelector__value"
      placeholder="Search Group"
      type="search"
      on:input={filterGroups}
    />
    <ul class="Viewer-GroupSelector__list">
      {#each filteredGroups.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage) as group}
        <li class="Viewer-GroupSelector__item">
          <div class="Viewer-GroupSelector__item-icon">
            <svg
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="32" height="32" rx="4" fill="#F8FAFB" />
              <g clip-path="url(#clip0_1672_5680)">
                <path
                  d="M11.0183 14.7752C10.961 14.7836 10.9319 14.7581 10.93 14.6991C10.9293 14.679 10.9288 14.659 10.9288 14.639C10.9287 13.1523 10.9274 12.6234 10.9295 11.1367C10.9302 10.6434 11.211 10.2537 11.6511 10.1224C11.7481 10.0934 11.8476 10.0794 11.949 10.0795C12.9878 10.0797 14.0267 10.0786 15.0655 10.0801C15.6481 10.0809 16.0739 10.5212 16.074 11.1196C16.0743 12.6029 16.0738 13.1285 16.074 14.6118C16.074 14.7945 16.0186 14.7723 15.8647 14.7697C15.3486 14.7608 11.141 14.7573 11.0183 14.7752ZM10.1775 22.6667C10.0428 22.6667 9.91246 22.684 9.78763 22.739C9.26977 22.9673 9.29376 23.4009 9.38384 23.774C9.48048 24.1742 9.85506 24.332 10.2563 24.3321C13.0589 24.3331 20.8084 24.3343 21.7631 24.3318C22.2365 24.3307 22.6416 23.9546 22.66 23.4901C22.6728 23.1665 22.6626 23.0862 22.6647 22.762C22.6652 22.6925 22.6355 22.6646 22.5709 22.6672C22.5384 22.6685 22.5059 22.6671 22.4734 22.6671C20.46 22.6671 12.1844 22.6673 10.1775 22.6667ZM22.0182 16.9993C21.8937 16.1594 21.6571 15.3588 21.2435 14.6181C20.7936 13.8121 20.1713 13.1821 19.4112 12.6875C18.6678 12.2037 17.8624 11.8932 16.995 11.7501C16.8691 11.7293 16.8541 11.7379 16.854 11.8406C16.8531 12.6928 16.8538 13.545 16.8531 14.3972C16.853 14.4666 16.8774 14.5055 16.9459 14.5275C17.6652 14.7587 18.2702 15.17 18.7522 15.766C19.2084 16.33 19.3892 16.9878 19.3498 17.7139C19.3451 17.8003 19.3645 17.8355 19.4533 17.8348C19.8268 17.8316 20.2003 17.8293 20.5737 17.8345C21.041 17.841 21.5087 17.8111 21.9756 17.8514C22.0954 17.8617 22.0988 17.8567 22.0941 17.7264C22.0752 17.4833 22.054 17.2406 22.0182 16.9993ZM22.5424 21.9465C22.6352 21.9474 22.6673 21.9165 22.6662 21.8202C22.6622 21.4563 22.6672 19.8779 22.6632 19.3967C22.6609 19.1074 22.5388 18.8764 22.3168 18.7C22.1317 18.553 21.9141 18.5193 21.691 18.5188C20.9115 18.5168 19.0807 18.5166 18.9443 18.5338C18.0684 18.6445 17.3998 19.4146 17.3968 20.3236C17.395 20.855 17.3962 21.2744 17.3965 21.8058C17.3966 21.9416 17.3999 21.9447 17.5345 21.9448C18.3691 21.945 22.1234 21.9427 22.5424 21.9465ZM11.1763 15.4932C10.8131 15.4939 10.5457 15.7655 10.5477 16.1267C10.5484 16.267 10.5507 16.4073 10.552 16.5476C10.5576 17.17 11.0175 17.492 11.6211 17.4932C12.8744 17.4954 14.1276 17.4951 15.3808 17.4933C15.9249 17.4925 16.3507 17.2771 16.4475 16.7262C16.4796 16.5438 16.4605 16.3594 16.4616 16.176C16.4643 15.7529 16.2123 15.4931 15.8029 15.4928C15.0367 15.4923 11.9523 15.4917 11.1763 15.4932ZM15.6792 21.9448C15.817 21.9447 15.8188 21.9426 15.8191 21.7975C15.8193 21.6839 15.8236 21.57 15.8179 21.4566C15.8043 21.1865 15.694 20.9706 15.4732 20.8159C15.3058 20.6985 15.1171 20.6784 14.9239 20.6782C14.0015 20.6772 13.0792 20.6774 12.1568 20.6783C12.0628 20.6784 11.9685 20.683 11.8749 20.6913C11.509 20.7237 11.2053 21.057 11.1967 21.4353C11.1938 21.5589 11.195 21.6826 11.1957 21.8062C11.1964 21.9425 11.1992 21.9447 11.3337 21.9447C12.058 21.9447 14.9549 21.9449 15.6792 21.9448ZM15.0862 9.35992C15.1728 9.36036 15.2012 9.33007 15.1918 9.24146C15.0804 8.19011 14.1502 7.4919 13.1423 7.70492C12.456 7.84995 11.8907 8.48764 11.824 9.19197C11.8093 9.34745 11.8177 9.35771 11.9585 9.3577C12.4749 9.35765 14.56 9.35723 15.0862 9.35992ZM11.8724 18.2152C11.7568 18.2153 11.7447 18.2295 11.7454 18.3487C11.7483 18.8388 12.1817 19.1688 12.6643 19.1747C13.2293 19.1817 13.7945 19.1816 14.3594 19.1746C14.8308 19.1688 15.2508 18.8496 15.2568 18.3646C15.2585 18.224 15.2524 18.216 15.1166 18.2158C14.5775 18.2151 12.4147 18.2146 11.8724 18.2152Z"
                  fill="#0BC6FF"
                />
              </g>
              <defs>
                <clipPath id="clip0_1672_5680">
                  <rect
                    width="20"
                    height="20"
                    fill="white"
                    transform="translate(6 6)"
                  />
                </clipPath>
              </defs>
            </svg>
          </div>
          <div class="Viewer-GroupSelector__item-main">
            <p class="Viewer-GroupSelector__item-namespace">
              <span class="Viewer-GroupSelector__item-text">
                {group}
              </span>
            </p>
            <p class="Viewer-GroupSelector__item-name">
              <span class="Viewer-GroupSelector__item-text">
                {group}
              </span>
            </p>
          </div>
        </li>
      {/each}
    </ul>
    {#if pages > 1}
      <div class="Viewer-GroupSelector__controls">
        <button on:click={onPrevious} disabled={currentPage == 0}
          >Previous</button
        >
        <p class="m-0">
          {rangeToPagination(currentPage, itemsPerPage, filteredGroups.length)}
        </p>
        <button on:click={onNext} disabled={currentPage == pages - 1}
          >Next</button
        >
      </div>
    {/if}
  </div>
</section-menu>

<style lang="scss">
  .Viewer-GroupSelector {
    display: flex;
    font-family: Inter, Arial, 'sans-serif';
    flex-direction: column;

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

      div {
        display: flex;
        align-items: center;
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
      margin: 6px;
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

    &__icon {
      padding: 6px;
      display: flex;
      align-items: center;
      justify-self: center;
      border-radius: 4px;
      background-color: var(--viewer-surface-secondary);
    }

    &__item {
      align-items: center;
      background-color: var(--viewer-surface-primary);
      box-shadow: var(--viewer-shadow-small);
      gap: 10px;
      cursor: pointer;
      margin-bottom: 8px;
      display: flex;
      font-size: 14px;
      padding: 4px 16px;
      border-radius: 8px;

      &:last-child {
        margin-bottom: 0;
      }

      &-name,
      &-namespace {
        margin: 0;
        display: flex;
        white-space: nowrap;
      }

      &-namespace {
        font-size: 12px;
        font-weight: 600;
        color: var(--viewer-text-tertiary);
        line-height: 1;
      }

      &-main {
        overflow: hidden;
      }

      &-name {
        font-size: 15px;
        font-weight: 700;
        color: var(--viewer-text-primary);
        line-height: 16px;
        flex: 1;
      }

      &-text {
        white-space: nowrap;
        text-overflow: ellipsis;
        overflow: hidden;
      }
    }
  }
</style>

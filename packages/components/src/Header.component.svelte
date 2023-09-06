<svelte:options customElement="header-menu" />

<script>
  export let visibleContent = true;
  export let toggleCallback = (visible) => {};

  function onClick(event) {
    visibleContent = !visibleContent;
    toggleCallback(visibleContent);
  }
</script>

<h5 class="Viewer-Header">
  <span><slot /></span>
  <button class="Viewer-Header__button" on:click={onClick}>
    <svg
      class={visibleContent ? 'Viewer-Header__icon' : 'Viewer-Header__icon--rotated'}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10 14.1667C9.78952 14.1671 9.58107 14.1253 9.38697 14.0438C9.19287 13.9623 9.01705 13.8428 8.86988 13.6923L3.20436 7.94964C3.01984 7.76165 2.91653 7.5087 2.91669 7.24528C2.91684 6.98186 3.02044 6.72904 3.20518 6.54126C3.29599 6.44895 3.40428 6.37565 3.52372 6.32565C3.64317 6.27564 3.77138 6.24992 3.90087 6.25C4.03035 6.25008 4.15853 6.27595 4.27792 6.3261C4.3973 6.37625 4.5055 6.44968 4.5962 6.54209L10 12.0198L15.4039 6.54209C15.4946 6.44972 15.6028 6.37633 15.7222 6.32621C15.8415 6.27608 15.9697 6.25023 16.0992 6.25015C16.2287 6.25008 16.3569 6.27578 16.4763 6.32576C16.5957 6.37574 16.704 6.44899 16.7949 6.54126C16.9796 6.72904 17.0832 6.98186 17.0834 7.24527C17.0835 7.50869 16.9802 7.76163 16.7957 7.94963L11.1304 13.6923C10.9831 13.8428 10.8073 13.9623 10.6132 14.0438C10.419 14.1252 10.2106 14.167 10 14.1667Z"
        fill="var(--viewer-text-primary)"
        fillOpacity="0.7"
      />
    </svg>
  </button>
</h5>

<style lang="scss">
  .Viewer-Header {
    color: var(--viewer-text-primary, rgba(0, 0, 0, 0.87));
    font-family: Inter, Arial, 'sans-serif';
    justify-content: space-between;
    font-size: 16px;
    font-style: normal;
    font-weight: 700;
    line-height: 24px;
    margin: 0 0 16px;
    display: flex;
    align-items: center;
    height: 40px;

    span {
      display: inline-flex;
    }

    svg {
      margin-right: 8px;
    }

    &__button {
      border: 0;
      outline: none;
      background-color: transparent;

      &:hover {
        cursor: pointer;
      }
    }

    &__icon {
      transition: all 0.3s ease-in-out;
      transform: rotate(0deg);

      &--rotated {
        transform: rotate(270deg);
      }
    }
  }
</style>

<svelte:options customElement="dual-slider" />

<script>
  import { Events } from './constants/events';

  export let label, min, max, id;

  let leftHandle;
  let body;
  let slider;
  const capacity = max - min;
  const offset = Number(min) < 0 ? Math.abs(min) : 0;
  let start = Number(min);
  let end = Number(max);

  $: startPositionPercentage = (start + offset) / capacity;
  $: endPositionPercentage = (end + offset) / capacity;
  $: valueMinRounder = start.toFixed(2);
  $: valueMaxRounder = end.toFixed(2);

  function draggable(node) {
    let x;
    let y;
    function handleMousedown(event) {
      if (event.type === 'touchstart') {
        event = event.touches[0];
      }
      x = event.clientX;
      y = event.clientY;
      node.dispatchEvent(
        new CustomEvent('dragstart', {
          detail: { x, y }
        })
      );
      window.addEventListener('mousemove', handleMousemove);
      window.addEventListener('mouseup', handleMouseup);
      window.addEventListener('touchmove', handleMousemove);
      window.addEventListener('touchend', handleMouseup);
    }
    function handleMousemove(event) {
      if (event.type === 'touchmove') {
        event = event.changedTouches[0];
      }
      const dx = event.clientX - x;
      const dy = event.clientY - y;
      x = event.clientX;
      y = event.clientY;
      node.dispatchEvent(
        new CustomEvent('dragmove', {
          detail: { x, y, dx, dy }
        })
      );
    }
    function handleMouseup(event) {
      x = event.clientX;
      y = event.clientY;
      node.dispatchEvent(
        new CustomEvent('dragend', {
          detail: { x, y }
        })
      );
      window.removeEventListener('mousemove', handleMousemove);
      window.removeEventListener('mouseup', handleMouseup);
      window.removeEventListener('touchmove', handleMousemove);
      window.removeEventListener('touchend', handleMouseup);
    }
    node.addEventListener('mousedown', handleMousedown);
    node.addEventListener('touchstart', handleMousedown);
    return {
      destroy() {
        node.removeEventListener('mousedown', handleMousedown);
        node.removeEventListener('touchstart', handleMousedown);
      }
    };
  }
  function setHandlePosition(which) {
    return function (evt) {
      const { left, right } = slider.getBoundingClientRect();
      const parentWidth = right - left;
      const percentage = Math.min(
        Math.max((evt.detail.x - left) / parentWidth, 0),
        1
      );
      const val = percentage * capacity - offset;

      if (which === 'start') {
        start = val;
        end = Math.max(end, val);
      } else {
        start = Math.min(val, start);
        end = val;
      }

      window.dispatchEvent(
        new CustomEvent(Events.DUAL_SLIDER_CHANGE, {
          detail: {
            values: [start, end],
            id
          }
        })
      );
    };
  }
</script>

<div>
  {#if label}
    <label class="dual-slider__label" for="dual-range-slider"
      >{label}: {valueMinRounder} - {valueMaxRounder}</label
    >
  {/if}

  <div class="dual-slider__container">
    <div class="dual-slider__slider" bind:this={slider}>
      <div
        class="double-range__active-slider"
        bind:this={body}
        style="
				left: {100 * startPositionPercentage}%;
				right: {100 * (1 - endPositionPercentage)}%;
			"
      />
      <div
        class="double-range__handle"
        bind:this={leftHandle}
        data-which="start"
        use:draggable
        on:dragmove|preventDefault|stopPropagation={setHandlePosition('start')}
        style="
				left: {100 * startPositionPercentage}%
			"
      />
      <div
        class="double-range__handle"
        data-which="end"
        use:draggable
        on:dragmove|preventDefault|stopPropagation={setHandlePosition('end')}
        style="
				left: {100 * endPositionPercentage}%
			"
      />
    </div>
  </div>
</div>

<style>
  .dual-slider__container {
    width: 100%;
    height: 20px;
    user-select: none;
    box-sizing: border-box;
    white-space: nowrap;
  }
  .dual-slider__label {
    color: #fff;
    font-size: 10px;
  }
  .dual-slider__slider {
    position: relative;
    width: 100%;
    height: 6px;
    top: 50%;
    transform: translate(0, -50%);
    background-color: #e2e2e2;
    border-radius: 23px;
  }

  .double-range__handle {
    position: absolute;
    top: 50%;
    width: 0;
    height: 0;
  }
  .double-range__handle:after {
    content: ' ';
    box-sizing: border-box;
    position: absolute;
    border-radius: 7px;
    width: 8px;
    height: 20px;
    background-color: #717171;
    transform: translate(-50%, -50%);
  }
  .double-range__handle:active:after {
    background-color: #ddd;
    z-index: 9;
  }
  .double-range__active-slider {
    top: 0;
    position: absolute;
    background-color: #0070f0;
    bottom: 0;
  }
</style>

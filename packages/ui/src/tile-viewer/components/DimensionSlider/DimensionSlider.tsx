import React from 'react';
import '../Slider/Slider.scss';
import { Dimension } from '@tiledb-inc/viz-core';

interface Props {
  dimension: Dimension;
  onDimensionUpdate: (value: number, name: string) => void;
}

const DimensionSlider: React.FC<Props> = props => {
  const handleRangeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    props.onDimensionUpdate(
      Number((event?.target as HTMLInputElement)?.value),
      props.dimension.name
    );
  };

  return (
    <div className="ImageViewer-Slider">
      <div className="ImageViewer-Slider__main">
        <div className="ImageViewer-Slider__left">
          <p className="ImageViewer-Slider__text">{props.dimension.name}</p>
        </div>

        <div className="ImageViewer-Slider__info">
          <p className="ImageViewer-Slider__value">
            {Number(props.dimension.value)}
          </p>
        </div>
      </div>
      <input
        className="ImageViewer-Slider__range"
        type="range"
        step={1}
        value={props.dimension.value}
        onChange={handleRangeChange}
        min={props.dimension.min}
        max={props.dimension.max}
      />
    </div>
  );
};

export default DimensionSlider;
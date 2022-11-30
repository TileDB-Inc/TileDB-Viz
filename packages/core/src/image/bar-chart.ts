import * as d3 from 'd3';
//import { Canvg, presets } from 'canvg';

export function createBarChart() {
  const data = [
    {
      name: 'Burj Khalifa',
      height: 828
    },
    {
      name: 'Shanghai Tower',
      height: 623
    },
    {
      name: 'Abraj Al-Bait Clock Tower',
      height: 601
    },
    {
      name: 'Ping An Finance Centre',
      height: 599
    },
    {
      name: 'Lotte World Tower',
      height: 544.5
    }
  ];

  const svg = d3
    .create('svg')
    .attr('xmlns', 'http://www.w3.org/2000/svg')
    .attr('width', 400)
    .attr('height', 400);

  console.log(data);

  const y = d3.scaleLinear().domain([0, 828]).range([0, 400]);

  const rects = svg.selectAll('rect').data(data);

  rects
    .enter()
    .append('rect')
    .attr('y', 0)
    .attr('x', (d: any, i: number) => i * 60)
    .attr('width', 40)
    .attr('height', (d: { height: any }) => y(d.height))
    .attr('fill', 'blue');

  return svg;
}

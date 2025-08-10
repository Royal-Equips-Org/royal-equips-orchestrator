import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface SystemMetric {
  timestamp: Date;
  value: number;
  category: 'cpu' | 'memory' | 'network' | 'agents';
}

interface RealTimeMonitorProps {
  data: SystemMetric[];
  width?: number;
  height?: number;
}

export const RealTimeMonitor: React.FC<RealTimeMonitorProps> = ({ 
  data, 
  width = 400, 
  height = 200 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    const margin = { top: 20, right: 30, bottom: 30, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Group data by category
    const groupedData = d3.group(data, d => d.category);
    const categories = Array.from(groupedData.keys());

    // Scales
    const xScale = d3.scaleTime()
      .domain(d3.extent(data, d => d.timestamp) as [Date, Date])
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.value) || 100])
      .range([innerHeight, 0]);

    const colorScale = d3.scaleOrdinal<string>()
      .domain(categories)
      .range(['#00ffff', '#ff00ff', '#00ff41', '#ffaa00']);

    // Create line generator
    const line = d3.line<SystemMetric>()
      .x(d => xScale(d.timestamp))
      .y(d => yScale(d.value))
      .curve(d3.curveMonotoneX);

    // Add grid lines
    g.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale)
        .tickSize(-innerHeight)
        .tickFormat(() => '')
      )
      .selectAll('line')
      .style('stroke', '#1a1a2e')
      .style('opacity', 0.3);

    g.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(yScale)
        .tickSize(-innerWidth)
        .tickFormat(() => '')
      )
      .selectAll('line')
      .style('stroke', '#1a1a2e')
      .style('opacity', 0.3);

    // Draw lines for each category
    categories.forEach(category => {
      const categoryData = groupedData.get(category) || [];
      
      g.append('path')
        .datum(categoryData)
        .attr('fill', 'none')
        .attr('stroke', colorScale(category))
        .attr('stroke-width', 2)
        .attr('stroke-opacity', 0.8)
        .attr('d', line);

      // Add glow effect
      g.append('path')
        .datum(categoryData)
        .attr('fill', 'none')
        .attr('stroke', colorScale(category))
        .attr('stroke-width', 6)
        .attr('stroke-opacity', 0.2)
        .attr('d', line)
        .style('filter', 'blur(3px)');

      // Add data points
      g.selectAll(`.dot-${category}`)
        .data(categoryData)
        .enter().append('circle')
        .attr('class', `dot-${category}`)
        .attr('cx', d => xScale(d.timestamp))
        .attr('cy', d => yScale(d.value))
        .attr('r', 3)
        .attr('fill', colorScale(category))
        .style('opacity', 0.8);
    });

    // Add axes
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat('%H:%M')))
      .selectAll('text')
      .style('fill', '#ffffff')
      .style('font-size', '12px');

    g.append('g')
      .call(d3.axisLeft(yScale))
      .selectAll('text')
      .style('fill', '#ffffff')
      .style('font-size', '12px');

    // Style axes
    g.selectAll('.domain, .tick line')
      .style('stroke', '#ffffff')
      .style('opacity', 0.3);

    // Add legend
    const legend = g.append('g')
      .attr('transform', `translate(${innerWidth - 100}, 20)`);

    categories.forEach((category, i) => {
      const legendRow = legend.append('g')
        .attr('transform', `translate(0, ${i * 20})`);

      legendRow.append('rect')
        .attr('width', 12)
        .attr('height', 12)
        .attr('fill', colorScale(category))
        .attr('opacity', 0.8);

      legendRow.append('text')
        .attr('x', 16)
        .attr('y', 9)
        .attr('dy', '0.35em')
        .style('fill', '#ffffff')
        .style('font-size', '12px')
        .text(category.toUpperCase());
    });

  }, [data, width, height]);

  return (
    <div style={{ 
      background: 'rgba(26, 26, 46, 0.8)', 
      borderRadius: '8px', 
      padding: '16px',
      border: '1px solid rgba(0, 255, 255, 0.2)'
    }}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{ display: 'block' }}
      />
    </div>
  );
};
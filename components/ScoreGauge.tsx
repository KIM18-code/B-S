import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface Props {
  score: number;
  label: string;
  color?: string;
}

const ScoreGauge: React.FC<Props> = ({ score, label, color = "#0d9488" }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 200;
    const height = 120; // Half circle
    const radius = Math.min(width, height * 2) / 2 - 10;

    const g = svg
      .append("g")
      .attr("transform", `translate(${width / 2},${height - 10})`);

    // Define Gradient
    const defs = svg.append("defs");
    const gradientId = `score-gradient-${label.replace(/\s+/g, '-')}`;
    const linearGradient = defs.append("linearGradient")
      .attr("id", gradientId)
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "0%");

    // Determine gradient colors based on score
    let startColor = "#ef4444";
    let endColor = "#ef4444";
    
    if (score > 70) {
      startColor = "#2dd4bf"; // brand-400
      endColor = "#0f766e";   // brand-700
    } else if (score > 40) {
      startColor = "#fcd34d";
      endColor = "#f59e0b";
    }

    linearGradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", startColor);

    linearGradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", endColor);

    // Background Arc
    const arcBg = d3.arc()
      .innerRadius(radius - 15)
      .outerRadius(radius)
      .startAngle(-Math.PI / 2)
      .endAngle(Math.PI / 2)
      .cornerRadius(10);

    g.append("path")
      .datum({ endAngle: Math.PI / 2 })
      .style("fill", "#f1f5f9")
      .attr("d", arcBg as any);

    // Foreground Arc
    const arcFg = d3.arc()
      .innerRadius(radius - 15)
      .outerRadius(radius)
      .cornerRadius(10)
      .startAngle(-Math.PI / 2);

    // Calculate angle based on score (0-100) -> (-PI/2 to PI/2)
    const targetAngle = -Math.PI / 2 + (Math.PI * score) / 100;

    g.append("path")
      .datum({ endAngle: targetAngle })
      .style("fill", `url(#${gradientId})`)
      .attr("d", arcFg as any)
      .transition()
      .duration(1500)
      .ease(d3.easeCubicOut)
      .attrTween("d", function(d: any) {
        const i = d3.interpolate({ endAngle: -Math.PI / 2 }, d);
        return function(t: number) { return arcFg(i(t)) || ""; };
      });

    // Score Text
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("y", -15)
      .style("font-family", "Inter, sans-serif")
      .style("font-size", "42px")
      .style("font-weight", "800")
      .style("fill", "#1e293b")
      .text(0)
      .transition()
      .duration(1500)
      .tween("text", function() {
        const i = d3.interpolate(0, score);
        return function(t) {
          this.textContent = Math.round(i(t)).toString();
        };
      });
    
    // Label Text
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("y", 15)
      .style("font-family", "Inter, sans-serif")
      .style("font-size", "12px")
      .style("fill", "#94a3b8")
      .style("font-weight", "600")
      .style("letter-spacing", "0.05em")
      .text("/ 100 POINTS");

  }, [score, label, color]);

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 h-full">
      <h3 className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">{label}</h3>
      <svg ref={svgRef} width={200} height={120} className="overflow-visible" />
    </div>
  );
};

export default ScoreGauge;
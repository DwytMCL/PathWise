"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  Position,
  MarkerType,
  useReactFlow,
  useStore,
  type Edge,
  type Node
} from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import { ArrowRight, Compass, Eye, Filter, Layers, LayoutGrid } from "lucide-react";
import type { Course } from "@/lib/curriculum";
import { isComplete } from "@/lib/planner";

function FocusCourse({ code, nodes }: { code: string; nodes: Node[] }) {
  const { setCenter, viewportInitialized } = useReactFlow();
  const width = useStore(state => state.width);
  const height = useStore(state => state.height);
  useEffect(() => {
    const node = nodes.find(item => item.id === code);
    if (viewportInitialized && node) void setCenter(node.position.x + 116, node.position.y + 58, { zoom: 0.85 });
  }, [viewportInitialized, code, nodes, setCenter, width, height]);
  return null;
}

type Scope = "relatives" | "all" | "remaining";
type Direction = "LR" | "TB";

export default function CurriculumGraph({
  courses,
  blocked,
  onSelect,
  onBoard,
  initialCourse
}: {
  courses: Course[];
  blocked: Map<string, string[]>;
  onSelect: (code: string) => void;
  onBoard?: (code: string) => void;
  initialCourse?: string | null;
}) {
  const [chosen, setChosen] = useState(
    initialCourse ?? courses.find(c => !isComplete(c))?.code ?? courses[0]?.code ?? ""
  );
  const [scope, setScope] = useState<Scope>("relatives");
  const [direction, setDirection] = useState<Direction>("LR");
  const [yearFilter, setYearFilter] = useState<number | "all">("all");
  const [showMinimap, setShowMinimap] = useState(true);

  // If initialCourse changes from outside (e.g. Trace link clicked)
  useEffect(() => {
    if (initialCourse && courses.some(c => c.code === initialCourse)) {
      setChosen(initialCourse);
    }
  }, [initialCourse, courses]);

  const activeCourse = courses.find(c => c.code === chosen);

  // Compute graph dependencies, metrics, and critical path
  const graphAnalytics = useMemo(() => {
    const courseMap = new Map<string, Course>(courses.map(c => [c.code, c]));
    const codes = new Set(courses.map(c => c.code));

    // Calculate upstream prerequisites
    function getUpstream(rootCode: string): Set<string> {
      const upstream = new Set<string>();
      const queue = [rootCode];
      while (queue.length > 0) {
        const current = queue.shift()!;
        const prereqs = courseMap.get(current)?.prerequisites ?? [];
        for (const p of prereqs) {
          if (p !== rootCode && codes.has(p) && !upstream.has(p)) {
            upstream.add(p);
            queue.push(p);
          }
        }
      }
      return upstream;
    }

    // Calculate downstream unlocks
    function getDownstream(rootCode: string): Set<string> {
      const downstream = new Set<string>();
      const queue = [rootCode];
      while (queue.length > 0) {
        const current = queue.shift()!;
        for (const c of courses) {
          if (c.prerequisites.includes(current) && c.code !== rootCode && !downstream.has(c.code)) {
            downstream.add(c.code);
            queue.push(c.code);
          }
        }
      }
      return downstream;
    }

    // Topological depth calculations for Longest Chain / Critical Path
    // Upstream depth: max distance from root
    const memoUpstreamDepth = new Map<string, number>();
    function getUpstreamDepth(code: string, visited = new Set<string>()): number {
      if (memoUpstreamDepth.has(code)) return memoUpstreamDepth.get(code)!;
      if (visited.has(code)) return 0;
      visited.add(code);
      const prereqs = courseMap.get(code)?.prerequisites.filter(p => codes.has(p)) ?? [];
      if (prereqs.length === 0) {
        memoUpstreamDepth.set(code, 0);
        return 0;
      }
      const maxPre = Math.max(...prereqs.map(p => getUpstreamDepth(p, new Set(visited))));
      const depth = maxPre + 1;
      memoUpstreamDepth.set(code, depth);
      return depth;
    }

    // Downstream depth: max distance to a leaf node
    const memoDownstreamDepth = new Map<string, number>();
    function getDownstreamDepth(code: string, visited = new Set<string>()): number {
      if (memoDownstreamDepth.has(code)) return memoDownstreamDepth.get(code)!;
      if (visited.has(code)) return 0;
      visited.add(code);
      const dependents = courses.filter(c => c.prerequisites.includes(code));
      if (dependents.length === 0) {
        memoDownstreamDepth.set(code, 0);
        return 0;
      }
      const maxDep = Math.max(...dependents.map(d => getDownstreamDepth(d.code, new Set(visited))));
      const depth = maxDep + 1;
      memoDownstreamDepth.set(code, depth);
      return depth;
    }

    // Calculate critical path: courses whose total chain length equals the maximum chain length
    courses.forEach(c => {
      getUpstreamDepth(c.code);
      getDownstreamDepth(c.code);
    });

    let maxChainLength = 0;
    courses.forEach(c => {
      const totalChain = (memoUpstreamDepth.get(c.code) ?? 0) + (memoDownstreamDepth.get(c.code) ?? 0);
      if (totalChain > maxChainLength) maxChainLength = totalChain;
    });

    const criticalCourseCodes = new Set<string>();
    if (maxChainLength > 0) {
      courses.forEach(c => {
        const totalChain = (memoUpstreamDepth.get(c.code) ?? 0) + (memoDownstreamDepth.get(c.code) ?? 0);
        if (totalChain === maxChainLength) {
          criticalCourseCodes.add(c.code);
        }
      });
    }

    const chosenUpstream = getUpstream(chosen);
    const chosenDownstream = getDownstream(chosen);

    return {
      upstream: chosenUpstream,
      downstream: chosenDownstream,
      getUpstream,
      getDownstream,
      upstreamDepth: memoUpstreamDepth.get(chosen) ?? 0,
      downstreamDepth: memoDownstreamDepth.get(chosen) ?? 0,
      isCritical: criticalCourseCodes.has(chosen),
      criticalCourseCodes,
      maxChainLength
    };
  }, [courses, chosen]);

  const availableYears = useMemo(() => {
    const maxYear = Math.max(1, ...courses.map(c => Math.max(c.year, c.originalYear)));
    return Array.from({ length: maxYear }, (_, i) => i + 1);
  }, [courses]);

  // Layout and Node/Edge computation
  const { nodes, edges } = useMemo(() => {
    const { upstream, downstream, criticalCourseCodes } = graphAnalytics;

    // Filter courses according to selected scope and year filter
    let visible = courses;
    if (scope === "relatives") {
      const related = new Set([
        chosen,
        ...upstream,
        ...downstream,
        ...(activeCourse?.corequisites ?? []),
        ...courses.filter(c => c.corequisites.includes(chosen)).map(c => c.code)
      ]);
      visible = visible.filter(c => related.has(c.code));
    } else if (scope === "remaining") {
      visible = visible.filter(c => !isComplete(c) || c.code === chosen);
    }

    if (yearFilter !== "all") {
      visible = visible.filter(c => c.year === yearFilter || c.code === chosen);
    }

    const visibleCodes = new Set(visible.map(c => c.code));

    // Configure Dagre graph layout
    const graph = new dagre.graphlib.Graph();
    graph.setGraph({
      rankdir: direction,
      nodesep: direction === "TB" ? 36 : 40,
      ranksep: direction === "TB" ? 70 : 100,
      marginx: 30,
      marginy: 30
    });
    graph.setDefaultEdgeLabel(() => ({}));

    const nodeWidth = 236;
    const nodeHeight = 118;

    visible.forEach(c => graph.setNode(c.code, { width: nodeWidth, height: nodeHeight }));
    visible.forEach(c => {
      c.prerequisites.filter(code => visibleCodes.has(code)).forEach(code => graph.setEdge(code, c.code));
    });

    dagre.layout(graph);

    const sourcePos = direction === "LR" ? Position.Right : Position.Bottom;
    const targetPos = direction === "LR" ? Position.Left : Position.Top;

    const nodes: Node[] = visible.map(course => {
      const point = graph.node(course.code) ?? { x: 0, y: 0 };
      const isChosen = chosen === course.code;
      const isUpstream = upstream.has(course.code);
      const isDownstream = downstream.has(course.code);
      const isDone = isComplete(course);
      const isBlocked = blocked.has(course.code);
      const isCritical = criticalCourseCodes.has(course.code);
      const isOffTerm = course.term !== course.originalTerm;

      let relationClass = "";
      if (isChosen) relationClass = "selected";
      else if (isUpstream) relationClass = "upstream";
      else if (isDownstream) relationClass = "downstream";

      return {
        id: course.code,
        width: nodeWidth,
        height: nodeHeight,
        position: { x: point.x - nodeWidth / 2, y: point.y - nodeHeight / 2 },
        sourcePosition: sourcePos,
        targetPosition: targetPos,
        ariaLabel: `${course.code}: ${course.title}. ${isDone ? "Completed" : isBlocked ? "Blocked" : "Remaining"}`,
        data: {
          label: (
            <div className="graph-node-inner">
              <div className="graph-node-top">
                <strong>{course.code}</strong>
                <span>{course.creditUnits}u</span>
              </div>
              <span className="graph-course-title">{course.title}</span>
              <div className="graph-node-badges">
                {isCritical && <span className="node-badge badge-critical">CRITICAL</span>}
                {isBlocked && <span className="node-badge badge-blocked">BLOCKED</span>}
                {isDone && <span className="node-badge badge-done">DONE</span>}
                {isOffTerm && <span className="node-badge badge-offterm">OFF-TERM</span>}
              </div>
              <small>
                Term {course.originalTerm} offering · Year {course.year}
              </small>
            </div>
          )
        },
        className: `graph-node ${isDone ? "is-done" : isBlocked ? "is-blocked" : ""} ${isCritical ? "is-critical" : ""} ${relationClass}`
      };
    });

    const edges: Edge[] = [];

    visible.forEach(course => {
      // Prerequisite edges
      course.prerequisites
        .filter(code => visibleCodes.has(code))
        .forEach(code => {
          const isAlternative = course.prerequisiteGroups?.some(group => group.length > 1 && group.includes(code)) ?? false;
          const isUpstreamEdge =
            (code === chosen || upstream.has(code)) && (course.code === chosen || upstream.has(course.code));
          const isDownstreamEdge =
            (code === chosen || downstream.has(code)) && (course.code === chosen || downstream.has(course.code));

          let edgeColor = "#94a3b8";
          let strokeWidth = 1.6;
          let opacity = 0.35;
          let zIndex = 1;

          if (isUpstreamEdge) {
            edgeColor = "#2563eb";
            strokeWidth = 2.4;
            opacity = 1;
            zIndex = 10;
          } else if (isDownstreamEdge) {
            edgeColor = "#ea580c";
            strokeWidth = 2.4;
            opacity = 1;
            zIndex = 10;
          } else if (scope === "relatives") {
            opacity = 0.7;
          }

          edges.push({
            id: `pre-${code}-${course.code}`,
            source: code,
            target: course.code,
            type: "smoothstep",
            label: isAlternative ? "OR" : undefined,
            labelStyle: isAlternative ? { fill: "#334155", fontSize: 10, fontWeight: 700 } : undefined,
            labelBgStyle: isAlternative ? { fill: "#fff", fillOpacity: 0.9 } : undefined,
            zIndex,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: edgeColor,
              width: 14,
              height: 14
            },
            style: {
              stroke: edgeColor,
              strokeWidth,
              opacity,
              ...(isAlternative ? { strokeDasharray: "5 4" } : {})
            }
          });
        });

      // Corequisite edges
      course.corequisites
        .filter(code => visibleCodes.has(code))
        .forEach(code => {
          edges.push({
            id: `co-${code}-${course.code}`,
            source: code,
            target: course.code,
            type: "smoothstep",
            label: "corequisite",
            style: { stroke: "#6b647c", strokeDasharray: "5 4", strokeWidth: 1.5 },
            labelStyle: { fill: "#51465e", fontSize: 10, fontWeight: 600 }
          });
        });
    });

    return { nodes, edges };
  }, [courses, chosen, blocked, scope, direction, yearFilter, graphAnalytics, activeCourse]);

  const totalUnlockedUnits = useMemo(() => {
    return courses
      .filter(c => graphAnalytics.downstream.has(c.code))
      .reduce((sum, c) => sum + c.creditUnits, 0);
  }, [courses, graphAnalytics.downstream]);

  return (
    <section className="graph-shell" aria-label="Prerequisite graph">
      {/* Enhanced Graph Toolbar */}
      <div className="graph-toolbar">
        <div className="graph-toolbar-row">
          <label className="graph-course-select-label">
            <span className="toolbar-label">Active course:</span>
            <select
              value={chosen}
              onChange={e => setChosen(e.target.value)}
              className="graph-course-select"
            >
              {courses.map(c => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.title}
                </option>
              ))}
            </select>
          </label>

          <div className="graph-controls-group">
            <span className="toolbar-label">Scope:</span>
            <div className="pill-group" role="group" aria-label="Graph Scope">
              <button
                type="button"
                className={`pill-btn ${scope === "relatives" ? "active" : ""}`}
                onClick={() => setScope("relatives")}
                title="Show active course, its prerequisites, and its unlocked courses"
              >
                <Compass size={13} /> Relatives
              </button>
              <button
                type="button"
                className={`pill-btn ${scope === "all" ? "active" : ""}`}
                onClick={() => setScope("all")}
                title="Show entire curriculum"
              >
                <Layers size={13} /> All Courses
              </button>
              <button
                type="button"
                className={`pill-btn ${scope === "remaining" ? "active" : ""}`}
                onClick={() => setScope("remaining")}
                title="Show only uncompleted courses"
              >
                <Eye size={13} /> Remaining
              </button>
            </div>
          </div>

          <div className="graph-controls-group">
            <span className="toolbar-label">Flow:</span>
            <div className="pill-group" role="group" aria-label="Layout Direction">
              <button
                type="button"
                className={`pill-btn ${direction === "LR" ? "active" : ""}`}
                onClick={() => setDirection("LR")}
                title="Horizontal layout (Left to Right)"
              >
                Left to Right
              </button>
              <button
                type="button"
                className={`pill-btn ${direction === "TB" ? "active" : ""}`}
                onClick={() => setDirection("TB")}
                title="Vertical layout (Top to Bottom)"
              >
                Top to Bottom
              </button>
            </div>
          </div>

          <label className="graph-minimap-toggle">
            <input
              type="checkbox"
              checked={showMinimap}
              onChange={e => setShowMinimap(e.target.checked)}
            />
            <span>Minimap</span>
          </label>
        </div>

        {/* Year Filter Chips */}
        <div className="graph-toolbar-subrow">
          <div className="graph-year-chips" role="group" aria-label="Filter by year">
            <span className="toolbar-label">Filter year:</span>
            <button
              type="button"
              className={`pill-btn ${yearFilter === "all" ? "active" : ""}`}
              onClick={() => setYearFilter("all")}
            >
              All Years
            </button>
            {availableYears.map(yr => (
              <button
                type="button"
                key={yr}
                className={`pill-btn ${yearFilter === yr ? "active" : ""}`}
                onClick={() => setYearFilter(yr)}
              >
                Year {yr}
              </button>
            ))}
          </div>
          <p className="graph-instructions">
            Blue arrows lead from prerequisites into the active course. Orange arrows lead to unlocked courses. Drag or click nodes to explore.
          </p>
        </div>
      </div>

      {/* Canvas */}
      <div className="graph-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          minZoom={0.2}
          maxZoom={1.6}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable
          panOnScroll={false}
          zoomOnScroll={false}
          onNodeClick={(_, node) => setChosen(node.id)}
        >
          <Background color="#d7dfe4" gap={24} size={1} />
          <Controls showInteractive={false} fitViewOptions={{ padding: 0.15, minZoom: 0.4, maxZoom: 1 }} />
          {showMinimap && (
            <MiniMap
              nodeColor={node => {
                if (node.id === chosen) return "#174f75";
                if (graphAnalytics.upstream.has(node.id)) return "#2563eb";
                if (graphAnalytics.downstream.has(node.id)) return "#ea580c";
                if (node.className?.includes("is-done")) return "#52a447";
                if (node.className?.includes("is-blocked")) return "#dc2626";
                return "#cbd5e1";
              }}
              nodeStrokeWidth={2}
              zoomable
              pannable
              className="graph-minimap"
            />
          )}
          <FocusCourse code={chosen} nodes={nodes} />
        </ReactFlow>
      </div>

      {/* Rich Inspector & Dependency Metrics Bar */}
      <div className="graph-inspector" aria-live="polite">
        <div className="graph-inspector-main">
          <div className="inspector-heading">
            <span className="section-index">COURSE INSPECTOR</span>
            <h3>
              {chosen}: {activeCourse?.title}
            </h3>
            <p className="inspector-offering">
              Catalog Offering: Term {activeCourse?.originalTerm} · Current Plan: Year {activeCourse?.year}, Term {activeCourse?.term}
              {activeCourse && activeCourse.term !== activeCourse.originalTerm && " (Outside catalog offering)"}
            </p>
          </div>

          <div className="inspector-actions">
            {onBoard && (
              <button
                type="button"
                className="secondary-button"
                onClick={() => onBoard(chosen)}
                title="Highlight on Term Board"
              >
                <LayoutGrid size={14} /> View on Term Board
              </button>
            )}
            <button
              type="button"
              className="primary-button"
              onClick={() => onSelect(chosen)}
              title="Open course details drawer"
            >
              Edit course <ArrowRight size={14} />
            </button>
          </div>
        </div>

        <div className="graph-metrics-grid">
          <div className="graph-metric-tile">
            <span className="metric-label">Prerequisite Depth</span>
            <strong>{graphAnalytics.upstreamDepth} Level{graphAnalytics.upstreamDepth === 1 ? "" : "s"}</strong>
            <small>
              {graphAnalytics.upstream.size ? `${graphAnalytics.upstream.size} total courses upstream` : "No prerequisite prerequisites"}
            </small>
          </div>

          <div className="graph-metric-tile">
            <span className="metric-label">Unlock Impact</span>
            <strong>{graphAnalytics.downstream.size} Course{graphAnalytics.downstream.size === 1 ? "" : "s"}</strong>
            <small>{totalUnlockedUnits} units depend on completing this course</small>
          </div>

          <div className="graph-metric-tile">
            <span className="metric-label">Graduation Path Impact</span>
            <strong className={graphAnalytics.isCritical ? "metric-critical" : ""}>
              {graphAnalytics.isCritical ? "CRITICAL PATH" : "Flexible Path"}
            </strong>
            <small>
              {graphAnalytics.isCritical
                ? "Direct bottleneck to on-time degree completion"
                : "Has buffer relative to the longest graduation chain"}
            </small>
          </div>
        </div>

        <div className="graph-chains-summary">
          <p>
            <span className="legend-upstream">Prerequisites</span>{" "}
            {graphAnalytics.upstream.size ? Array.from(graphAnalytics.upstream).join(", ") : "None required"}
          </p>
          <p>
            <span className="legend-downstream">Unlocks</span>{" "}
            {graphAnalytics.downstream.size ? Array.from(graphAnalytics.downstream).join(", ") : "None (Terminal course)"}
          </p>
        </div>
      </div>
    </section>
  );
}

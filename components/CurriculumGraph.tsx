"use client";

import { useEffect, useMemo, useState } from "react";
import { ReactFlow, Controls, Background, Position, MarkerType, useReactFlow, type Edge, type Node } from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import { ArrowRight, GitBranch, Info, LayoutGrid, Search } from "lucide-react";
import { courseConnections, formatRequirements, type Course } from "@/lib/curriculum";
import { isComplete } from "@/lib/planner";

function FitGraph({ nodes }: { nodes: Node[] }) {
  const { fitView, viewportInitialized } = useReactFlow();
  useEffect(() => { if (viewportInitialized) void fitView({ nodes, padding: .22, minZoom: .3, maxZoom: .9, duration: 0 }); }, [nodes, viewportInitialized, fitView]);
  return null;
}

export default function CurriculumGraph({ courses, blocked, onSelect, onBoard, initialCourse }: {
  courses: Course[]; blocked: Map<string, string[]>; onSelect: (code: string) => void;
  onBoard?: (code: string) => void; initialCourse?: string | null;
}) {
  const [chosen, setChosen] = useState(initialCourse ?? courses.find(c => !isComplete(c))?.code ?? courses[0]?.code ?? "");
  const [scope, setScope] = useState<"direct" | "chain" | "all">("direct");
  const [direction, setDirection] = useState<"LR" | "TB">(() => window.matchMedia("(max-width: 640px)").matches ? "TB" : "LR");
  const [mode, setMode] = useState<"graph" | "list">(() => window.matchMedia("(max-width: 640px)").matches ? "list" : "graph");
  const [query, setQuery] = useState("");
  useEffect(() => { if (initialCourse) setChosen(initialCourse); }, [initialCourse]);
  const active = courses.find(c => c.code === chosen);
  const results = courses.filter(c => `${c.code} ${c.title}`.toLowerCase().includes(query.toLowerCase()));
  const directNext = courses.filter(c => c.prerequisites.includes(chosen) || c.corequisites.includes(chosen));
  const connections = useMemo(() => courseConnections(courses, chosen, scope === "chain"), [courses, chosen, scope]);
  const relation = (course: Course) => course.code === chosen ? "Selected course"
    : active?.prerequisites.includes(course.code) ? "Prerequisite option"
    : active?.corequisites.includes(course.code) ? "Corequisite option"
    : course.prerequisites.includes(chosen) ? `Requires ${chosen}`
    : course.corequisites.includes(chosen) ? `Take with or after ${chosen}`
    : connections.upstream.has(course.code) ? "Dependency in this chain"
    : connections.downstream.has(course.code) ? "Depends on this chain" : "Other course";

  const { nodes, edges } = useMemo(() => {
    const { upstream, downstream } = connections;
    const related = new Set([chosen, ...upstream, ...downstream]);
    const visible = courses.filter(c => scope === "all" || related.has(c.code));
    const codes = new Set(visible.map(c => c.code));
    const graph = new dagre.graphlib.Graph();
    graph.setGraph({ rankdir: direction, nodesep: 34, ranksep: 90, marginx: 25, marginy: 25 });
    graph.setDefaultEdgeLabel(() => ({}));
    visible.forEach(c => graph.setNode(c.code, { width: 248, height: 152 }));
    visible.forEach(c => c.prerequisites.filter(code => codes.has(code)).forEach(code => graph.setEdge(code,c.code)));
    visible.forEach(c => c.corequisites.filter(code => codes.has(code)).forEach(code => graph.setEdge(code,c.code)));
    dagre.layout(graph);
    const nodes: Node[] = visible.map(c => {
      const point = graph.node(c.code);
      const relation = c.code === chosen ? "Selected course" : upstream.has(c.code) ? "Dependency" : downstream.has(c.code) ? "Depends on this chain" : "Other course";
      return { id: c.code, position: { x: point.x-124, y: point.y-76 }, width:248, height:152,
        sourcePosition: direction === "LR" ? Position.Right : Position.Bottom, targetPosition: direction === "LR" ? Position.Left : Position.Top,
        ariaLabel: `${c.code}: ${c.title}. ${relation}. Inferred Term ${c.originalTerm} offering. ${isComplete(c) ? "Completed" : blocked.has(c.code) ? "Needs prerequisites" : "Not completed"}`,
        className: `graph-node ${c.code === chosen ? "selected" : ""} ${isComplete(c) ? "is-done" : ""}`,
        data: { label: <div className="graph-node-inner"><span className="node-relation">{relation}</span><div className="graph-node-top"><strong>{c.code}</strong><span>{c.creditUnits} units</span></div><span className="graph-course-title">{c.title}</span><small>Inferred Term {c.originalTerm} offering</small><span className="node-status">{isComplete(c) ? "Completed" : blocked.has(c.code) ? "Needs prerequisites" : "Not completed"}</span></div> },
      };
    });
    const edges: Edge[] = visible.flatMap(c => [
      ...c.prerequisites.filter(code => codes.has(code)).map(code => {
        const alternative = c.prerequisiteGroups.some(group => group.length>1 && group.includes(code));
        const emphasized = code === chosen || c.code === chosen;
        const color = emphasized ? "#285c7a" : "#677f90";
        return { id:`pre-${code}-${c.code}`,source:code,target:c.code,type:"smoothstep",label:alternative ? "OR" : undefined,
          markerEnd:{type:MarkerType.ArrowClosed,color,width:16,height:16},
          style:{stroke:color,strokeWidth:emphasized ? 2 : 1.5,...alternative ? {strokeDasharray:"5 4"} : {}},
          labelStyle:{fill:"#172d3d",fontSize:11}, labelBgStyle:{fill:"#fff"},
        };
      }),
      ...c.corequisites.filter(code => codes.has(code)).map(code => ({ id:`co-${code}-${c.code}`,source:code,target:c.code,type:"smoothstep",label:"With / before",style:{stroke:"#6b647c",strokeDasharray:"5 5",strokeWidth:1.5},labelStyle:{fill:"#51465e",fontSize:10} })),
    ]);
    return { nodes, edges };
  }, [courses, chosen, connections, scope, direction, blocked]);

  return <section className="graph-shell" aria-labelledby="graph-title">
    <div className="graph-heading"><div><span className="section-index">UNDERSTAND THE CONNECTIONS</span><h2 id="graph-title">What comes before. What comes after.</h2><p>Choose a course to explore the requirements around it.</p></div></div>
    <div className="graph-toolbar"><label className="graph-search"><Search size={16} /><span className="sr-only">Filter course selector</span><input type="search" placeholder="Find a course by code or title" value={query} onChange={e => setQuery(e.target.value)} /></label><label className="graph-course-select-label"><span className="sr-only">Selected course</span><select value={chosen} onChange={e => setChosen(e.target.value)}><option value={chosen}>{chosen} · {active?.title}</option>{results.filter(c => c.code !== chosen).map(c => <option key={c.code} value={c.code}>{c.code} · {c.title}</option>)}</select>{!results.length && query && <small>No matches. Clear the search to see all courses.</small>}</label><div className="pill-group" role="group" aria-label="Graph scope">{([['direct','Connections'],['chain','Full chain'],['all','All courses']] as const).map(([value,label]) => <button key={value} className={`pill-btn ${scope === value ? "active" : ""}`} aria-pressed={scope === value} onClick={() => setScope(value)}>{label}</button>)}</div><div className="pill-group" role="group" aria-label="Dependency display"><button className={`pill-btn ${mode === "graph" ? "active" : ""}`} aria-pressed={mode === "graph"} onClick={() => setMode("graph")}>Graph</button><button className={`pill-btn ${mode === "list" ? "active" : ""}`} aria-pressed={mode === "list"} onClick={() => setMode("list")}>Course list</button></div>{mode === "graph" && <button className="text-button" onClick={() => setDirection(d => d === "LR" ? "TB" : "LR")}>Flow: {direction === "LR" ? "horizontal" : "vertical"}</button>}</div>
    <div className="graph-exploration"><div>{mode === "graph" ? <><div className="graph-canvas"><ReactFlow nodes={nodes} edges={edges} nodesDraggable={false} nodesConnectable={false} minZoom={.2} maxZoom={1.5} zoomOnScroll={false} panOnScroll={false} onNodeClick={(_,node) => { setChosen(node.id); setQuery(""); }}><Background color="#d3dfe7" gap={24} size={1} /><Controls showInteractive={false} fitViewOptions={{padding:.22,maxZoom:.9}} /><FitGraph nodes={nodes} /></ReactFlow></div><div className="graph-legend"><span><i /> Prerequisite → later course</span><span><i className="dashed" /> Corequisite / OR alternative</span><span>{nodes.length} courses shown · Use + to zoom</span></div></> : <section className="connection-list" aria-label="Connected courses"><h3>Connections around {chosen}</h3><p>Prerequisites finish before a course. Corequisites may finish together. “Or” means one option in that group; “and” means each group is required.</p>{nodes.map(node => { const course = courses.find(c => c.code === node.id)!; return <button key={node.id} className={node.id === chosen ? "active" : ""} onClick={() => setChosen(node.id)}><span><strong>{course.code}</strong><small>{relation(course)}</small></span><span>{course.title}<small>Inferred Term {course.originalTerm} offering · {isComplete(course) ? "Completed" : "Not completed"}</small><small><b>Before:</b> {formatRequirements(course.prerequisiteGroups,course.prerequisites) || "No prerequisites listed"}</small>{course.corequisites.length > 0 && <small><b>With or before:</b> {formatRequirements(course.corequisiteGroups,course.corequisites)}</small>}</span><ArrowRight size={16} /></button>; })}</section>}</div>
      {active && <aside className="graph-inspector" aria-label="Selected course and text alternative"><span className="section-index">SELECTED COURSE</span><h3>{active.code}</h3><p className="inspector-title">{active.title}</p><div className="inspector-offering"><strong>Inferred Term {active.originalTerm} offering</strong><span>Planned: Year {active.year} · Term {active.term}</span></div>{blocked.has(chosen) && <p className="offering-warning"><Info size={16} /> Current plan needs: {blocked.get(chosen)?.join(", ")}</p>}
        <h4>Required before this course</h4><p className="requirement-expression">{formatRequirements(active.prerequisiteGroups,active.prerequisites) || "No prerequisites listed."}</p><div className="dependency-links">{active.prerequisites.map(code => <button key={code} disabled={!courses.some(c => c.code === code)} onClick={() => setChosen(code)}>{code}<ArrowRight size={14} /></button>)}</div>
        {active.corequisites.length > 0 && <><h4>Take with or complete before</h4><p className="requirement-expression">{formatRequirements(active.corequisiteGroups,active.corequisites)}</p></>}
        <h4>Courses connected after this</h4><p className="inspector-note">These courses reference {chosen}. Other requirements may also apply.</p><div className="dependency-links">{directNext.length ? directNext.map(c => <button key={c.code} onClick={() => setChosen(c.code)}>{c.code}<ArrowRight size={14} /></button>) : <p>No later courses listed.</p>}</div>
        <div className="inspector-actions"><button className="primary-button" onClick={() => onSelect(chosen)}>Course details <ArrowRight size={15} /></button>{onBoard && <button className="secondary-button" onClick={() => onBoard(chosen)}><LayoutGrid size={16} /> Find on term board</button>}</div>
      </aside>}
    </div><p className="graph-help"><GitBranch size={16} /> {mode === "graph" ? "Drag the canvas to explore. Switch to Course list for a text view." : "Course list gives you the same visible courses without panning or zooming."} Every visible requirement is also available as text in course details. Offering terms are inferred from your file.</p>
  </section>;
}

import { chainCourses, chainLinks, terms } from "./example";
import s from "./Landing.module.css";

const column = (term: number) => 12.5 + term * 25;
const row = (index: number) => 20 + index * 30;
const half = 9.5; // half a node's width, as a share of the graph

const byCode = new Map(chainCourses.map(course => [course.code, course]));

// Prerequisite chain for the fictional curriculum, laid out by planned term.
export default function ChainGraph() {
  return <figure className={s.graph} data-graph data-ui aria-labelledby="graph-caption">
    <div className={s.graphTerms} aria-hidden="true">{terms.map(term => <span key={term}>{term}</span>)}</div>
    <div className={s.graphField}>
      {/* Stretched to the field; pathLength keeps every link drawable from 0 to 1. */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {chainLinks.map(([from, to]) => {
          const a = byCode.get(from)!, b = byCode.get(to)!;
          const x1 = column(a.term) + half, y1 = row(a.row), x2 = column(b.term) - half, y2 = row(b.row), mid = (x1 + x2) / 2;
          return <path key={from + to} data-link={from} d={`M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`} pathLength={1} />;
        })}
      </svg>
      <ul>{chainCourses.map(course => <li key={course.code} data-node={course.code} data-focus={course.code === "CS201" || undefined} data-term={terms[course.term]} style={{ left: `${column(course.term)}%`, top: `${row(course.row)}%` }}>
        <small>{course.code}</small><strong>{course.title}</strong>
      </li>)}</ul>
    </div>
    <figcaption id="graph-caption">Fictional example: Data structures (CS201) leads to Algorithms and Databases, then Software studio, then the Capstone project.</figcaption>
  </figure>;
}

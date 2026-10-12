import { useEffect, useRef, useState } from 'react';
import { playClip, stopAudio } from './audio';
import { traceGroups, type TraceMode } from './traceData';

type Point = { x: number; y: number };
type Stroke = Point[];
const BOARD_WIDTH = 500;
const BOARD_HEIGHT = 360;
const SCALE = 3;

function SpeakerIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12"/></svg>;
}

function savedIndex(mode: TraceMode, length: number): number {
  try {
    const value = Number(sessionStorage.getItem(`cbear-trace-${mode}-v1`));
    return Number.isInteger(value) && value >= 0 && value < length ? value : 0;
  } catch { return 0; }
}

function TraceChooser() {
  return <div className="flash-page trace-page container">
    <a className="all-levels-link" href="#flash-cards">← Flash Cards</a>
    <div className="page-intro trace-intro"><span className="section-kicker">DRAW IT YOUR WAY</span><h1>Trace it. <em>Then try it.</em></h1><p>Follow the soft guide or draw beside it. There is no perfect line and no score.</p></div>
    <div className="trace-choice-grid">
      <a className="trace-choice" href="#flash-cards/trace/numbers"><span className="mini-kicker">01 / TEN SHAPES</span><span className="trace-choice-mark" aria-hidden="true">1—10</span><strong>Numbers</strong><span>Practise one to ten with a finger, stylus, or mouse.</span><span className="trace-choice-link">Start numbers →</span></a>
      <a className="trace-choice" href="#flash-cards/trace/letters"><span className="mini-kicker">02 / SIX SHAPES</span><span className="trace-choice-mark" aria-hidden="true">b d</span><strong>Letters</strong><span>Give p, q, b, d, g, and y a closer look.</span><span className="trace-choice-link">Start letters →</span></a>
    </div>
  </div>;
}

export function TracePractice({ mode }: { mode: TraceMode }) {
  const group = traceGroups[mode];
  const [index, setIndex] = useState(() => savedIndex(mode, group.shapes.length));
  const [showGuide, setShowGuide] = useState(true);
  const [hasInk, setHasInk] = useState(false);
  const [audioIssue, setAudioIssue] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const activePointer = useRef<number | null>(null);
  const shape = group.shapes[index];

  useEffect(() => {
    try { sessionStorage.setItem(`cbear-trace-${mode}-v1`, String(index)); }
    catch { /* Tracing still works without storage. */ }
  }, [mode, index]);
  useEffect(() => () => stopAudio(), []);

  function redrawInk() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    context.strokeStyle = '#315b49';
    context.fillStyle = '#315b49';
    context.lineWidth = 7;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    for (const stroke of strokesRef.current) {
      if (stroke.length === 1) {
        context.beginPath();
        context.arc(stroke[0].x, stroke[0].y, 3.5, 0, Math.PI * 2);
        context.fill();
      } else if (stroke.length > 1) {
        context.beginPath();
        context.moveTo(stroke[0].x, stroke[0].y);
        for (const point of stroke.slice(1)) context.lineTo(point.x, point.y);
        context.stroke();
      }
    }
  }

  function pointFor(event: React.PointerEvent<HTMLCanvasElement>): Point | null {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return {
      x: Math.max(0, Math.min(BOARD_WIDTH, (event.clientX - rect.left) * BOARD_WIDTH / rect.width)),
      y: Math.max(0, Math.min(BOARD_HEIGHT, (event.clientY - rect.top) * BOARD_HEIGHT / rect.height)),
    };
  }

  function pointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (activePointer.current !== null || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const point = pointFor(event);
    if (!point) return;
    activePointer.current = event.pointerId;
    strokesRef.current.push([point]);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setHasInk(true);
    redrawInk();
  }

  function pointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (activePointer.current !== event.pointerId) return;
    const point = pointFor(event);
    if (!point) return;
    const stroke = strokesRef.current.at(-1);
    if (!stroke) return;
    const previous = stroke.at(-1);
    if (previous && Math.hypot(point.x - previous.x, point.y - previous.y) < 1.2) return;
    stroke.push(point);
    redrawInk();
  }

  function pointerEnd(event: React.PointerEvent<HTMLCanvasElement>) {
    if (activePointer.current !== event.pointerId) return;
    pointerMove(event);
    activePointer.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function selectShape(next: number) {
    activePointer.current = null;
    strokesRef.current = [];
    redrawInk();
    setHasInk(false);
    setAudioIssue(false);
    stopAudio();
    setIndex((next + group.shapes.length) % group.shapes.length);
  }

  function clearDrawing() {
    activePointer.current = null;
    strokesRef.current = [];
    redrawInk();
    setHasInk(false);
  }

  function undoStroke() {
    strokesRef.current.pop();
    redrawInk();
    setHasInk(strokesRef.current.length > 0);
  }

  function hearShape() {
    setAudioIssue(false);
    playClip(shape.audio, shape.spoken).catch(() => setAudioIssue(true));
  }

  return <div className="flash-page trace-page container">
    <div className="trace-page-top"><a className="all-levels-link" href="#flash-cards/trace">← Trace choices</a><span className="mini-kicker">{group.title.toUpperCase()} · {index + 1} OF {group.shapes.length}</span></div>
    <div className="page-intro trace-practice-intro"><span className="section-kicker">DRAW IT YOUR WAY</span><h1>{group.title} <em>to trace.</em></h1><p>{group.description}</p></div>
    <div className="trace-layout">
      <aside className="trace-picker" aria-label={`Choose a ${mode === 'numbers' ? 'number' : 'letter'} to trace`}>
        <span className="mini-kicker">CHOOSE A SHAPE</span>
        <div className="trace-shape-list">{group.shapes.map((item, itemIndex) => <button key={item.id} type="button" className={`trace-shape-button ${index === itemIndex ? 'selected' : ''}`} aria-current={index === itemIndex ? 'true' : undefined} onClick={() => selectShape(itemIndex)}>{item.face}</button>)}</div>
        <p>Start anywhere. Try each shape as many times as you like.</p>
      </aside>
      <section className="trace-workspace" aria-label={`Trace ${shape.face}`}>
        <div className="trace-workspace-heading"><div><span className="mini-kicker">LOOK · LISTEN · DRAW</span><h2>{shape.face} <span>{shape.caption}</span></h2></div><button className="flash-sound-button" type="button" onClick={hearShape} aria-label={`Hear ${shape.face}`}><SpeakerIcon /> Hear it</button></div>
        <p className="trace-instruction">Use a finger or mouse. Draw over the guide or beside it.</p>
        <div className="trace-board">
          <svg className="trace-guide" viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`} aria-hidden="true" preserveAspectRatio="none">
            <path className="trace-rule" d="M38 140 H462 M38 285 H462" />
            {mode === 'letters' && <path className="trace-rule trace-descender-rule" d="M38 330 H462" />}
            {showGuide && shape.paths.map((path, pathIndex) => <path key={`${shape.id}-${pathIndex}`} className="trace-template" d={path} />)}
          </svg>
          <canvas ref={canvasRef} width={BOARD_WIDTH * SCALE} height={BOARD_HEIGHT * SCALE} aria-label={`Drawing area for ${shape.face}`} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd}>Draw {shape.face} using a touch screen or mouse.</canvas>
        </div>
        <div className="trace-tools"><button type="button" onClick={undoStroke} disabled={!hasInk}>Undo stroke</button><button type="button" onClick={clearDrawing} disabled={!hasInk}>Clear drawing</button><button type="button" onClick={() => setShowGuide(value => !value)}>{showGuide ? 'Hide guide' : 'Show guide'}</button></div>
        {audioIssue && <p className="audio-message" role="alert">This sound could not play. Check your volume or try another browser.</p>}
        <div className="trace-footer"><span>No score. Every try helps your hand learn.</span><div><button className="button button-quiet" type="button" onClick={() => selectShape(index - 1)}>← Previous</button><button className="button button-primary" type="button" onClick={() => selectShape(index + 1)}>Next shape →</button></div></div>
      </section>
    </div>
  </div>;
}

export function Trace({ mode }: { mode: TraceMode | null }) {
  return mode ? <TracePractice key={mode} mode={mode} /> : <TraceChooser />;
}

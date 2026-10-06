import type { StageId } from './puzzle';

export type Session = {
  stage: StageId;
  points: number;
  found: string[];
  foundItems: Record<string, string[]>;
};

export function targetIsFound(session: Session, puzzleId: string, targetId: string): boolean {
  return targetId === 'cbear'
    ? session.found.includes(puzzleId)
    : (session.foundItems[puzzleId] ?? []).includes(targetId);
}

export function awardTarget(session: Session, puzzleId: string, targetId: string): Session {
  if (targetIsFound(session, puzzleId, targetId)) return session;
  if (targetId === 'cbear') {
    return { ...session, points: session.points + 20, found: [...session.found, puzzleId] };
  }
  return {
    ...session,
    points: session.points + 5,
    foundItems: {
      ...session.foundItems,
      [puzzleId]: [...(session.foundItems[puzzleId] ?? []), targetId],
    },
  };
}

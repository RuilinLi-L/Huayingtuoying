import { tutorials } from './tutorials';
import type { TutorialKnowledgeCard } from '../types/tutorial';

/** Mobile presentation order and artwork; all explanatory copy stays in tutorials. */
export const theoryTopics = [
  {
    id: '01',
    cardId: 'pitch-register',
    illustration: '/assets/ui/theory/music-book.png',
  },
  {
    id: '02',
    cardId: 'rhythm-meter',
    illustration: '/assets/ui/theory/metronome.png',
  },
  {
    id: '03',
    cardId: 'harmony-texture',
    illustration: '/assets/ui/theory/chord-circle.png',
  },
] as const;

export type TheoryTopicId = (typeof theoryTopics)[number]['id'];

export interface ResolvedTheoryTopic {
  id: TheoryTopicId;
  card: TutorialKnowledgeCard;
  illustration: string;
  index: number;
}

const knowledgeCards = tutorials.find((module) => module.id === 'fundamentals')?.knowledgeCards ?? [];

export function getTheoryTopic(topicId: string | undefined): ResolvedTheoryTopic | undefined {
  const index = theoryTopics.findIndex((topic) => topic.id === topicId);
  if (index < 0) return undefined;

  const topic = theoryTopics[index];
  const card = knowledgeCards.find((item) => item.id === topic.cardId);
  if (!card) return undefined;

  return { id: topic.id, card, illustration: topic.illustration, index };
}

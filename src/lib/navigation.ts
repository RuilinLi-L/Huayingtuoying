import { theoryTopics } from '../data/theoryTopicDefinitions';

export type StageView = 'orchestra' | 'model' | 'ar' | 'image-test';
export function stagePath(view: StageView = 'ar', entryId = 'oboe-player', search = '') {
  const params = new URLSearchParams(search);
  params.set('view', view);
  params.set('entry', entryId);
  return `/stage?${params}`;
}
export function guidePath(hash = '') {
  const id = hash.replace(/^#/, '');
  if (id === 'instrument-encyclopedia') return '/knowledge/instruments';
  const topic = theoryTopics.find((item) => item.cardId === id);
  return topic ? `/knowledge/theory/${topic.id}` : '/knowledge/guide';
}

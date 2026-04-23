export interface TutorialLink {
  label: string;
  to: string;
  variant?: 'primary' | 'ghost';
}

export interface TutorialConcept {
  id: string;
  label: string;
  title: string;
  summary: string;
  takeaway: string;
}

export interface TutorialExample {
  id: string;
  label: string;
  title: string;
  description: string;
  observation: string;
  relatedEntryIds: string[];
  audioSrc?: string;
  audioLabel?: string;
  links?: TutorialLink[];
}

export interface TutorialChapter {
  id: string;
  shortLabel: string;
  title: string;
  intro: string;
  concepts: TutorialConcept[];
  examples: TutorialExample[];
  reflection: string;
  continueTitle: string;
  continueDescription: string;
  continueLinks: TutorialLink[];
}

export interface TutorialEntrySpotlight {
  entryId: string;
  chapterId: string;
  label: string;
  title: string;
  summary: string;
}

export interface TutorialModule {
  id: string;
  label: string;
  title: string;
  subtitle: string;
  description: string;
  preface: string;
  homeTitle: string;
  homeSummary: string;
  heroNotes: string[];
  chapters: TutorialChapter[];
  entrySpotlights: TutorialEntrySpotlight[];
}

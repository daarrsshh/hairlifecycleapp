export interface FaqEntry {
  id: string;
  question: string;
  answer: string;
}

export const FAQ: FaqEntry[] = [
  {
    id: 'how-long-until-results',
    question: 'How long until I see results?',
    answer:
      'Most people need 3 to 6 months of consistent use before they notice a difference, with the full effect taking up to a year. Photos taken every couple of weeks are the most reliable way to catch gradual change — it’s hard to notice day to day.',
  },
  {
    id: 'why-more-shedding',
    question: 'Why am I shedding more since I started?',
    answer:
      'An initial increase in shedding in the first few weeks is common and expected — it usually means weaker hairs are being pushed out to make room for new growth. It typically settles down within a few weeks to a couple of months.',
  },
  {
    id: 'what-happens-if-i-stop',
    question: 'What happens if I stop treatment?',
    answer:
      'For minoxidil, the effect generally fades within a few months of stopping — the hairs that were kept in the growth phase gradually return to their previous pattern. For finasteride/dutasteride, DHT levels return to normal once you stop, and the protective effect stops with it. This app tracks consistency for exactly this reason — the treatment only works while you keep doing it.',
  },
  {
    id: 'can-i-combine-treatments',
    question: 'Can I combine treatments?',
    answer:
      'Combining minoxidil with finasteride or dutasteride is common, since they work through different mechanisms. Any decision about starting, stopping, or combining treatments should be made with a doctor — this app tracks what you and your doctor have already decided, it doesn’t recommend a routine.',
  },
];

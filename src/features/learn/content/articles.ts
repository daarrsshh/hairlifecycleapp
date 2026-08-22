export interface Article {
  id: string;
  category: string;
  title: string;
  body: string;
}

export const CATEGORIES = [
  'What is hair loss',
  'Why it happens',
  'How treatments work',
  'What to expect',
  'Lifestyle factors',
] as const;

export const ARTICLES: Article[] = [
  {
    id: 'what-is-hair-loss',
    category: 'What is hair loss',
    title: 'What is hair loss?',
    body:
      'Hair grows in a cycle: a growth phase that can last years, a short transition phase, and a resting phase before the hair sheds and a new one starts. Hair loss happens when that cycle is disrupted — hairs spend less time growing, or more hairs sit in the resting/shedding phase at once. The most common pattern, often called male or female pattern hair loss, is gradual and follows a fairly predictable shape (receding at the temples and thinning at the crown is typical, but it varies a lot from person to person).',
  },
  {
    id: 'genetics-dht',
    category: 'Why it happens',
    title: 'Genetics and DHT',
    body:
      'Pattern hair loss is largely genetic. Hair follicles that are genetically sensitive gradually shrink in response to a hormone called DHT (dihydrotestosterone), a byproduct of testosterone. Smaller follicles produce thinner, shorter hairs over successive cycles. This sensitivity is inherited and can come from either side of the family — there is no single "hair loss gene."',
  },
  {
    id: 'age-and-stress',
    category: 'Why it happens',
    title: 'Age, stress, and other triggers',
    body:
      'Genetic sensitivity to DHT usually explains gradual, pattern-shaped thinning, but hair loss can also be triggered or worsened by other things: age-related changes, significant physical or emotional stress, illness, rapid weight change, some medications, and nutrient deficiencies. Stress-related shedding (telogen effluvium) tends to be more diffuse — thinning all over rather than in a pattern — and is often temporary.',
  },
  {
    id: 'how-minoxidil-works',
    category: 'How treatments work',
    title: 'How minoxidil works',
    body:
      'Minoxidil is applied directly to the scalp. It widens blood vessels and is thought to help push more follicles into (and keep them longer in) the growth phase, though the exact mechanism isn’t fully settled. It works on the follicle regardless of what caused the thinning, which is part of why it’s so widely used. It has to be applied consistently — its effect fades once you stop.',
  },
  {
    id: 'how-finasteride-dutasteride-work',
    category: 'How treatments work',
    title: 'How finasteride and dutasteride work',
    body:
      'Finasteride and dutasteride are pills that reduce how much DHT the body produces, by blocking the enzyme that converts testosterone into DHT. Since DHT is what shrinks genetically sensitive follicles, lowering it can slow further loss and, in some cases, allow shrunken follicles to partially recover. Dutasteride blocks that enzyme more completely than finasteride; the two are often compared but work the same way.',
  },
  {
    id: 'timelines-and-shedding',
    category: 'What to expect',
    title: 'Timelines, and the initial shedding phase',
    body:
      'These treatments work on a hair-cycle timescale, not a skin-cream timescale — visible results typically take 3 to 6 months of consistent use, and the full effect can take up to a year. It’s also common to notice more shedding in the first few weeks: as weak, miniaturized hairs are pushed out to make room for new growth, some people see a temporary increase in hair fall before things improve. This is expected and, for most people, resolves on its own with continued consistent use.',
  },
  {
    id: 'diet-and-scalp-care',
    category: 'Lifestyle factors',
    title: 'Diet and scalp care',
    body:
      'A generally balanced diet with enough protein, iron, and vitamin D supports healthy hair growth; deficiencies in these can make hair loss worse, though fixing them won’t reverse pattern hair loss on its own. Keeping the scalp clean and avoiding tight hairstyles that pull on the roots (traction) also helps protect the hair you have. None of this replaces treatment for pattern hair loss — it’s a supporting factor, not a fix.',
  },
  {
    id: 'stress-and-sleep',
    category: 'Lifestyle factors',
    title: 'Stress and sleep',
    body:
      'Chronic stress and poor sleep are linked to increased shedding, largely through the same telogen effluvium mechanism mentioned earlier. Managing stress and getting consistent sleep won’t reverse genetic pattern loss, but it can reduce the "extra" shedding layered on top of it.',
  },
];

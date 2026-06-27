import { ContactNode } from '../interfaces/contact.interface';

export const SCENE_MESSAGES: Record<string, string[]> = {
  boot: [
    'Welcome to CareerOS.',
    'Initializing the experience...',
    'Loading my engineering profile...',
    'Connecting all systems...',
    'Environment is ready.',
    'Let\'s begin the journey.'
  ],

  identity: [
    'Welcome to my Identity Core.',
    'Discover who I am.',
    'Beyond titles and resumes.',
    'Explore what drives me.',
    'Every fragment tells a story.',
    'This is where it all begins.'
  ],

  skills: [
    'Entering my Skills Engine.',
    'Explore my technical expertise.',
    'Each chamber is a skill domain.',
    'Hover to inspect technologies.',
    'Every skill solved real problems.',
    'Keep exploring.'
  ],

  experience: [
    'Welcome to my Engineering Journey.',
    'Follow my career timeline.',
    'Every milestone shaped me.',
    'Explore projects and achievements.',
    'See the impact behind my work.',
    'The journey continues.'
  ],

  ai: [
    'Welcome to my AI Core.',
    'This is how I think.',
    'Explore my engineering principles.',
    'Discover CareerOps.',
    'See what I\'m building next.',
    'Let\'s connect.'
  ]
};

export const CONTACT_NODES_LIST: ContactNode[] = [
  {
    id: 'github',
    label: 'GitHub',
    url: 'https://github.com/Ajitheshwar',
    color: '#00f0ff'
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    url: 'https://www.linkedin.com/in/vadla-ajitheshwar/',
    color: '#c0c1ff'
  },
  {
    id: 'phone',
    label: 'Phone',
    url: 'tel:+919347966409',
    color: '#ffaa00'
  },
  {
    id: 'email',
    label: 'Email',
    url: 'mailto:ajitheshwar1923@gmail.com',
    color: '#ddb7ff'
  }
];

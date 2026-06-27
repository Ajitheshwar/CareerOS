import { Milestone } from '../interfaces/timeline.interface';

export const FOCUS_WINDOWS = [
  { pStart: 0.01, pEnd: 0.12 }, // Milestone 1
  { pStart: 0.14, pEnd: 0.24 }, // Milestone 2
  { pStart: 0.26, pEnd: 0.36 }, // Milestone 3
  { pStart: 0.38, pEnd: 0.50 }, // Milestone 4 (Hero)
  { pStart: 0.52, pEnd: 0.62 }, // Milestone 5
  { pStart: 0.64, pEnd: 0.74 }, // Milestone 6
  { pStart: 0.76, pEnd: 0.86 }, // Milestone 7
  { pStart: 0.88, pEnd: 0.98 }  // Milestone 8 (Hero AI / CareerOps)
];

export const MILESTONES_LIST: Milestone[] = [
  {
    id: 1,
    year: '2022',
    title: 'Engineering Foundation',
    designation: 'MEAN Stack Learner',
    story: 'Started learning full-stack web development and software engineering fundamentals. Built multiple projects while learning frontend development, backend systems, databases, APIs, and software architecture concepts. This phase laid the foundation for the engineering journey.',
    tech: ['Angular', 'TypeScript', 'JavaScript', 'Node.js', 'Express', 'MongoDB', 'HTML5', 'CSS3', 'Git', 'REST APIs'],
    contributions: [
      'Learned Angular framework fundamentals.',
      'Built frontend applications using TypeScript.',
      'Developed backend APIs using Node.js.',
      'Worked with MongoDB databases.',
      'Learned Express.js application development.',
      'Practiced REST API integration.',
      'Built multiple end-to-end learning projects.',
      'Learned software development lifecycle concepts.',
      'Explored Git and collaborative workflows.'
    ],
    challenges: [
      'Understanding frontend architecture.',
      'Learning backend development concepts.',
      'Building complete applications independently.',
      'Learning database design.',
      'Connecting frontend and backend systems.'
    ],
    impact: [
      'Established strong engineering fundamentals.',
      'Built confidence in full-stack development.',
      'Learned software architecture concepts.',
      'Prepared for professional software development.'
    ],
    learnings: [
      'Full-stack thinking.',
      'Problem solving.',
      'Application architecture.',
      'Software engineering fundamentals.'
    ],
    side: 'left',
    x: -240,
    y: -80,
    z: 400,
    color: '#e2e1ee',
    colorRgb: '226, 225, 238'
  },
  {
    id: 2,
    year: 'Jan 2023 – May 2023',
    title: 'Software Development Intern',
    project: 'Vegetable Vendor Application',
    designation: 'Software Development Intern',
    story: 'Worked on the Vegetable Vendor Application using the MEAN stack and gained first-hand experience building business applications in a professional environment. Contributed to dashboards, workflows, and analytics systems while learning production-grade development practices.',
    tech: ['Angular', 'Node.js', 'Express', 'MongoDB', 'Highcharts', 'TypeScript', 'REST APIs', 'WebSockets'],
    contributions: [
      'Developed frontend modules using Angular.',
      'Implemented dashboard functionality.',
      'Worked on analytics visualizations.',
      'Built reusable UI components.',
      'Integrated APIs with frontend systems.',
      'Participated in feature development.',
      'Improved application workflows.',
      'Collaborated with mentors and team members.',
      'Contributed to business-focused product development.'
    ],
    challenges: [
      'First production-level development experience.',
      'Understanding business requirements.',
      'Building maintainable frontend code.',
      'Learning collaborative development practices.',
      'Working within deadlines.'
    ],
    impact: [
      'Delivered production features.',
      'Improved dashboard experiences.',
      'Built real-world development experience.',
      'Learned enterprise development workflows.'
    ],
    learnings: [
      'Professional software development.',
      'Product thinking.',
      'Team collaboration.',
      'Business workflow understanding.'
    ],
    side: 'right',
    x: 240,
    y: -80,
    z: 1000,
    color: '#00ffaa',
    colorRgb: '0, 255, 170'
  },
  {
    id: 3,
    year: 'May 2023',
    title: 'Software Engineer',
    company: 'Darwinbox',
    designation: 'Software Engineer',
    story: 'Joined Darwinbox as a full-time Software Engineer and started contributing to multiple enterprise-grade HR technology products used by large organizations. Worked across different modules and gained exposure to large-scale software systems.',
    tech: ['Angular', 'TypeScript', 'RxJS', 'NGXS', 'REST APIs', 'SCSS', 'Git'],
    contributions: [
      'Developed enterprise Angular applications.',
      'Worked across multiple product modules.',
      'Delivered customer-facing features.',
      'Integrated backend services.',
      'Collaborated with product managers.',
      'Participated in architecture discussions.',
      'Improved frontend maintainability.',
      'Worked with production-scale applications.',
      'Contributed to enterprise workflows.'
    ],
    challenges: [
      'Understanding enterprise business logic.',
      'Working with large codebases.',
      'Managing production-scale features.',
      'Learning cross-functional collaboration.',
      'Adapting to enterprise architecture.'
    ],
    impact: [
      'Delivered multiple features.',
      'Supported enterprise customers.',
      'Improved application functionality.',
      'Expanded product knowledge.'
    ],
    learnings: [
      'Enterprise software engineering.',
      'Collaboration at scale.',
      'Production ownership.',
      'Product architecture.'
    ],
    side: 'left',
    x: -240,
    y: -80,
    z: 1600,
    color: '#00f0ff',
    colorRgb: '0, 240, 255'
  },
  {
    id: 4,
    year: 'Dec 2023 – Jun 2024',
    title: 'Time Management Revamp',
    designation: 'Frontend Engineer',
    project: 'Time Management Revamp',
    story: 'Owned and delivered the frontend revamp of Darwinbox\'s largest and most business-critical Time Management module. The revamp modernized a legacy system into a scalable Angular-based architecture while supporting attendance, leave, shift, overtime, dashboard, and timesheet workflows used daily across enterprise customers.',
    tech: ['Angular', 'TypeScript', 'RxJS', 'NGXS', 'REST APIs', 'SCSS', 'Highcharts', 'Git', 'Performance Optimization', 'State Management'],
    contributions: [
      'Sole frontend engineer for the revamp.',
      'Built 100+ reusable components.',
      'Designed scalable Angular architecture.',
      'Created reusable state management patterns.',
      'Established standards adopted by future revamps.',
      'Collaborated with 13+ backend engineers, QA, PMs and UX.',
      'Implemented attendance workflows.',
      'Implemented leave management workflows.',
      'Implemented shift management workflows.',
      'Implemented timesheet systems.',
      'Built dashboard experiences.',
      'Led frontend ownership from design to production.'
    ],
    challenges: [
      'Migrating a legacy system.',
      'Large-scale frontend architecture.',
      'Complex enterprise workflows.',
      'High performance requirements.',
      'Thousands of rendered components.',
      'Cross-team coordination.',
      'Scalability concerns.'
    ],
    impact: [
      '100+ components delivered.',
      '5s → <1s performance improvement.',
      'Foundation for future module revamps.',
      'Improved maintainability.',
      'Increased developer productivity.',
      'Reusable architecture adoption.',
      'Enterprise-scale reliability.',
      'Better user experience.',
      'Faster feature development.'
    ],
    learnings: [
      'Technical ownership.',
      'Architecture design.',
      'Enterprise systems.',
      'Performance engineering.',
      'Leadership through execution.'
    ],
    side: 'right',
    x: 300,
    y: -85,
    z: 2400,
    color: '#ef4444',
    colorRgb: '239, 68, 68'
  },
  {
    id: 5,
    year: '2024',
    title: 'Best Employee Award',
    story: 'Recognized for exceptional contribution, ownership, and execution during the Time Management Revamp. Celebrated inside Darwinbox engineering for architectural execution and product impact.',
    tech: [],
    contributions: [
      'Delivered critical revamp milestones.',
      'Maintained high quality standards.',
      'Solved complex technical challenges.',
      'Demonstrated ownership.',
      'Collaborated effectively across teams.',
      'Contributed beyond assigned responsibilities.',
      'Supported successful project delivery.'
    ],
    challenges: [],
    impact: [
      'Best Employee Award.',
      'Organizational recognition.',
      'Engineering excellence.',
      'Strong team contribution.'
    ],
    learnings: [],
    side: 'left',
    x: -240,
    y: -80,
    z: 3200,
    color: '#ffcc00',
    colorRgb: '255, 204, 0'
  },
  {
    id: 6,
    year: 'April 2025',
    title: 'Promotion to SDE-II',
    story: 'Promoted to Software Development Engineer II based on technical contributions, ownership, consistency, and impact across modular frontend projects.',
    tech: [],
    contributions: [
      'Consistent delivery.',
      'Technical ownership.',
      'Cross-team collaboration.',
      'Feature leadership.',
      'Architecture contributions.',
      'Product impact.',
      'Engineering excellence.'
    ],
    challenges: [],
    impact: [
      'SDE-II Promotion.',
      'Increased responsibilities.',
      'Greater technical ownership.',
      'Leadership opportunities.'
    ],
    learnings: [],
    side: 'right',
    x: 240,
    y: -80,
    z: 3800,
    color: '#ddb7ff',
    colorRgb: '221, 183, 255'
  },
  {
    id: 7,
    year: '2025',
    title: 'Scheduling Point',
    designation: 'SDE-II',
    project: 'Scheduling Point',
    story: 'Led frontend development for Scheduling Point and contributed to workforce scheduling, planning systems, and enterprise scheduling workflows.',
    tech: ['Angular', 'TypeScript', 'RxJS', 'NGXS', 'REST APIs', 'System Design'],
    contributions: [
      'Led frontend implementation.',
      'Built scheduling workflows.',
      'Implemented planning systems.',
      'Developed reusable interfaces.',
      'Collaborated with stakeholders.',
      'Improved workflow efficiency.',
      'Delivered enterprise functionality.'
    ],
    challenges: [],
    impact: [
      'Enterprise scheduling platform.',
      'Workforce planning support.',
      'Improved operational workflows.',
      'Scalable scheduling systems.'
    ],
    learnings: [],
    side: 'left',
    x: -240,
    y: -80,
    z: 4400,
    color: '#4a60ff',
    colorRgb: '74, 96, 255'
  },
  {
    id: 8,
    year: '2026',
    title: 'CareerOps',
    designation: 'Creator & Engineer',
    project: 'CareerOps',
    story: 'Built CareerOps, an AI-powered Career Operating System that helps job seekers through resume optimization, job discovery, interview preparation, career guidance, and application tracking. Designed and implemented a multi-agent architecture powered by AI workflows and orchestration systems.',
    tech: ['Angular', 'Node.js', 'MongoDB Atlas', 'LangGraph', 'AI Agents', 'Prompt Engineering', 'Agentic Workflows', 'LLM Integration', 'AI Assisted Development'],
    contributions: [
      'Built CareerOps from scratch.',
      'Designed AI-powered workflows.',
      'Developed multi-agent architecture.',
      'Built resume intelligence systems.',
      'Built job matching systems.',
      'Developed interview preparation workflows.',
      'Implemented career guidance systems.',
      'Built application tracking functionality.',
      'Designed LangGraph orchestration.',
      'Integrated multiple job sources.',
      'Created AI-powered user experiences.'
    ],
    challenges: [],
    impact: [
      '10+ AI Agents.',
      'AI Career Operating System.',
      'Resume Intelligence.',
      'Job Matching.',
      'Interview Preparation.',
      'Career Guidance.',
      'Application Tracking.',
      'Built in 7 Days.',
      'End-to-end AI platform.'
    ],
    learnings: [
      'AI Product Development.',
      'Agentic Systems.',
      'Workflow Orchestration.',
      'Rapid Product Development.',
      'AI Engineering.'
    ],
    side: 'right',
    x: 300,
    y: -85,
    z: 5200,
    color: '#ffaa00',
    colorRgb: '255, 170, 0'
  }
];

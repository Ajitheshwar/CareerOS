import { Skill, SidebarBlock } from '../interfaces/skill.interface';

export const SIDEBAR_BLOCKS: SidebarBlock[] = [
  {
    title: 'FRAGMENTS_LOADED:',
    borderColorClass: 'border-primary-container/20',
    textColorClass: 'text-primary-container',
    items: [
      '// 100+ Components Built',
      '// Enterprise Applications',
      '// Reusable Architecture',
      '// Performance Optimization',
      '// Design Systems'
    ]
  },
  {
    title: 'NETWORK_PIPES:',
    borderColorClass: 'border-accent-teal/20',
    textColorClass: 'text-accent-teal',
    items: [
      '// REST Architecture',
      '// Async Packet Streams',
      '// Auth Token Handshakes',
      '// Secure Cryptography'
    ]
  },
  {
    title: 'STORAGE_SECTORS:',
    borderColorClass: 'border-secondary/20',
    textColorClass: 'text-secondary',
    items: [
      '// Document Aggregations',
      '// Optimized Query Latency',
      '// Real-time Cloud Sync',
      '// Normalized Data Structures'
    ]
  },
  {
    title: 'COGNITIVE_NET:',
    borderColorClass: 'border-accent-orange/20',
    textColorClass: 'text-accent-orange',
    items: [
      '// Autonomous Agents',
      '// Prompt Graph Loops',
      '// Memory Abstractions',
      '// LLM Assisted Workflows'
    ]
  },
  {
    title: 'FOUNDRY_CORE:',
    borderColorClass: 'border-primary/20',
    textColorClass: 'text-primary',
    items: [
      '// Scalable Architectures',
      '// Clean Code Standards',
      '// Team Agile Sprints',
      '// Domain Driven Design'
    ]
  }
];

export const SKILLS_DATA: Skill[] = [
  // Stage 0: Frontend (7 skills) - Electric Cyan (#00f0ff)
  { id: 'angular', name: 'Angular', isPrimary: true, description: 'Builds scalable enterprise frontends with modular architecture and reusable components.', stageIndex: 0, angle: 0, radius: 250, color: '#00f0ff', colorRgb: '0, 240, 255' },
  { id: 'typescript', name: 'TypeScript', isPrimary: true, description: 'Develops type-safe applications with improved maintainability and developer productivity.', stageIndex: 0, angle: (2 * Math.PI) / 7, radius: 280, color: '#00f0ff', colorRgb: '0, 240, 255' },
  { id: 'rxjs', name: 'RxJS', isPrimary: true, description: 'Implements reactive data flows and complex asynchronous workflows.', stageIndex: 0, angle: (4 * Math.PI) / 7, radius: 280, color: '#00f0ff', colorRgb: '0, 240, 255' },
  { id: 'javascript', name: 'JavaScript', isPrimary: false, description: 'Strong understanding of modern ES6+ patterns and browser runtime behavior.', stageIndex: 0, angle: (6 * Math.PI) / 7, radius: 420, color: '#00f0ff', colorRgb: '0, 240, 255' },
  { id: 'ngxs', name: 'NGXS', isPrimary: false, description: 'Manages scalable application state using predictable reactive patterns.', stageIndex: 0, angle: (8 * Math.PI) / 7, radius: 420, color: '#00f0ff', colorRgb: '0, 240, 255' },
  { id: 'html5', name: 'HTML5', isPrimary: false, description: 'Creates semantic, accessible, and standards-compliant web interfaces.', stageIndex: 0, angle: (10 * Math.PI) / 7, radius: 440, color: '#00f0ff', colorRgb: '0, 240, 255' },
  { id: 'css3', name: 'CSS3', isPrimary: false, description: 'Builds responsive, animated, and visually polished user experiences.', stageIndex: 0, angle: (12 * Math.PI) / 7, radius: 440, color: '#00f0ff', colorRgb: '0, 240, 255' },

  // Stage 1: Backend (7 skills) - Neon Mint-Teal (#00ffaa)
  { id: 'nodejs', name: 'Node.js', isPrimary: true, description: 'Develops high-performance backend services and APIs using JavaScript.', stageIndex: 1, angle: 0, radius: 250, color: '#00ffaa', colorRgb: '0, 255, 170' },
  { id: 'express', name: 'Express', isPrimary: true, description: 'Creates lightweight and scalable RESTful application backends.', stageIndex: 1, angle: (2 * Math.PI) / 7, radius: 280, color: '#00ffaa', colorRgb: '0, 255, 170' },
  { id: 'restapis', name: 'REST APIs', isPrimary: true, description: 'Designs and integrates secure and maintainable API contracts.', stageIndex: 1, angle: (4 * Math.PI) / 7, radius: 280, color: '#00ffaa', colorRgb: '0, 255, 170' },
  { id: 'apidesign', name: 'API Design', isPrimary: false, description: 'Structures scalable service interfaces for long-term maintainability.', stageIndex: 1, angle: (6 * Math.PI) / 7, radius: 420, color: '#00ffaa', colorRgb: '0, 255, 170' },
  { id: 'auth', name: 'Authentication', isPrimary: false, description: 'Implements secure user access and authorization workflows.', stageIndex: 1, angle: (8 * Math.PI) / 7, radius: 420, color: '#00ffaa', colorRgb: '0, 255, 170' },
  { id: 'serviceint', name: 'Service Integration', isPrimary: false, description: 'Coordinates data communication between external software and services.', stageIndex: 1, angle: (10 * Math.PI) / 7, radius: 440, color: '#00ffaa', colorRgb: '0, 255, 170' },
  { id: 'backcomm', name: 'Backend Comm.', isPrimary: false, description: 'Manages data transfer protocols and socket connections.', stageIndex: 1, angle: (12 * Math.PI) / 7, radius: 440, color: '#00ffaa', colorRgb: '0, 255, 170' },

  // Stage 2: Data (8 skills) - Indigo Secondary (#c0c1ff)
  { id: 'mongodb', name: 'MongoDB', isPrimary: true, description: 'Designs flexible document databases for modern applications.', stageIndex: 2, angle: 0, radius: 260, color: '#c0c1ff', colorRgb: '192, 193, 255' },
  { id: 'mysql', name: 'MySQL', isPrimary: true, description: 'Works with relational data models and optimized query design.', stageIndex: 2, angle: Math.PI / 4, radius: 260, color: '#c0c1ff', colorRgb: '192, 193, 255' },
  { id: 'firebase', name: 'Firebase', isPrimary: true, description: 'Builds real-time cloud-connected application features.', stageIndex: 2, angle: Math.PI / 2, radius: 280, color: '#c0c1ff', colorRgb: '192, 193, 255' },
  { id: 'highcharts', name: 'Highcharts', isPrimary: true, description: 'Creates interactive dashboards and business intelligence visualizations.', stageIndex: 2, angle: 3 * Math.PI / 4, radius: 280, color: '#c0c1ff', colorRgb: '192, 193, 255' },
  { id: 'datamodeling', name: 'Data Modeling', isPrimary: false, description: 'Designs efficient structures for scalable data storage and retrieval.', stageIndex: 2, angle: Math.PI, radius: 420, color: '#c0c1ff', colorRgb: '192, 193, 255' },
  { id: 'queryopt', name: 'Query Optimization', isPrimary: false, description: 'Improves application performance through efficient database operations.', stageIndex: 2, angle: 5 * Math.PI / 4, radius: 420, color: '#c0c1ff', colorRgb: '192, 193, 255' },
  { id: 'analytics', name: 'Analytics', isPrimary: false, description: 'Tracks, aggregates, and visualizes application performance metrics.', stageIndex: 2, angle: 6 * Math.PI / 4, radius: 440, color: '#c0c1ff', colorRgb: '192, 193, 255' },
  { id: 'dashboards', name: 'Dashboards', isPrimary: false, description: 'Builds interactive visualizations and controls for complex data.', stageIndex: 2, angle: 7 * Math.PI / 4, radius: 440, color: '#c0c1ff', colorRgb: '192, 193, 255' },

  // Stage 3: AI (9 skills) - Neon Orange (#ffaa00)
  { id: 'cursorai', name: 'Cursor AI', isPrimary: true, description: 'Accelerates software delivery through AI-assisted engineering workflows.', stageIndex: 3, angle: 0, radius: 250, color: '#ffaa00', colorRgb: '255, 170, 0' },
  { id: 'antigravity', name: 'Antigravity IDE', isPrimary: true, description: 'Leverages intelligent development environments for rapid prototyping.', stageIndex: 3, angle: 2 * Math.PI / 9, radius: 270, color: '#ffaa00', colorRgb: '255, 170, 0' },
  { id: 'prompteng', name: 'Prompt Engineering', isPrimary: true, description: 'Designs effective prompts for reliable AI-assisted outcomes.', stageIndex: 3, angle: 4 * Math.PI / 9, radius: 270, color: '#ffaa00', colorRgb: '255, 170, 0' },
  { id: 'agenticflows', name: 'Agentic Workflows', isPrimary: true, description: 'Builds autonomous workflows using multi-step AI orchestration.', stageIndex: 3, angle: 6 * Math.PI / 9, radius: 270, color: '#ffaa00', colorRgb: '255, 170, 0' },
  { id: 'langgraph', name: 'LangGraph', isPrimary: false, description: 'Orchestrates stateful agent workflows and reasoning pipelines.', stageIndex: 3, angle: 8 * Math.PI / 9, radius: 420, color: '#ffaa00', colorRgb: '255, 170, 0' },
  { id: 'multiagent', name: 'Multi-Agent', isPrimary: false, description: 'Coordinates specialized AI agents to solve complex tasks.', stageIndex: 3, angle: 10 * Math.PI / 9, radius: 420, color: '#ffaa00', colorRgb: '255, 170, 0' },
  { id: 'aiassisted', name: 'AI Assisted Dev', isPrimary: false, description: 'Leverages AI code generation and refinement for rapid delivery.', stageIndex: 3, angle: 12 * Math.PI / 9, radius: 440, color: '#ffaa00', colorRgb: '255, 170, 0' },
  { id: 'workfloworch', name: 'Workflow Orch.', isPrimary: false, description: 'Designs and coordinates multi-step automated development flows.', stageIndex: 3, angle: 14 * Math.PI / 9, radius: 440, color: '#ffaa00', colorRgb: '255, 170, 0' },
  { id: 'careerops', name: 'CareerOps', isPrimary: false, description: 'Automates professional operations and growth tracking systems.', stageIndex: 3, angle: 16 * Math.PI / 9, radius: 440, color: '#ffaa00', colorRgb: '255, 170, 0' },

  // Stage 4: Foundations (9 skills) - Soft White (#e2e1ee)
  { id: 'dsa', name: 'DSA', isPrimary: true, description: 'Applies algorithmic thinking and data structures to solve problems efficiently.', stageIndex: 4, angle: 0, radius: 250, color: '#e2e1ee', colorRgb: '226, 225, 238' },
  { id: 'sysdesign', name: 'System Design', isPrimary: true, description: 'Designs scalable, maintainable, and resilient software architectures.', stageIndex: 4, angle: 2 * Math.PI / 9, radius: 270, color: '#e2e1ee', colorRgb: '226, 225, 238' },
  { id: 'oop', name: 'OOP', isPrimary: true, description: 'Designs maintainable systems using object-oriented principles.', stageIndex: 4, angle: 4 * Math.PI / 9, radius: 270, color: '#e2e1ee', colorRgb: '226, 225, 238' },
  { id: 'patterns', name: 'Design Patterns', isPrimary: true, description: 'Uses proven architectural patterns to solve recurring engineering problems.', stageIndex: 4, angle: 6 * Math.PI / 9, radius: 270, color: '#e2e1ee', colorRgb: '226, 225, 238' },
  { id: 'sdlc', name: 'SDLC', isPrimary: false, description: 'Applies structured software development and delivery practices.', stageIndex: 4, angle: 8 * Math.PI / 9, radius: 420, color: '#e2e1ee', colorRgb: '226, 225, 238' },
  { id: 'agile', name: 'Agile/Scrum', isPrimary: false, description: 'Delivers software iteratively within cross-functional product teams.', stageIndex: 4, angle: 10 * Math.PI / 9, radius: 420, color: '#e2e1ee', colorRgb: '226, 225, 238' },
  { id: 'scalability', name: 'Scalability', isPrimary: false, description: 'Builds systems capable of handling growth and increasing complexity.', stageIndex: 4, angle: 12 * Math.PI / 9, radius: 440, color: '#e2e1ee', colorRgb: '226, 225, 238' },
  { id: 'ownership', name: 'Technical Ownership', isPrimary: false, description: 'Drives architecture, implementation, and delivery of critical features.', stageIndex: 4, angle: 14 * Math.PI / 9, radius: 440, color: '#e2e1ee', colorRgb: '226, 225, 238' },
  { id: 'problemsolving', name: 'Problem Solving', isPrimary: false, description: 'Transforms complex requirements into practical engineering solutions.', stageIndex: 4, angle: 16 * Math.PI / 9, radius: 440, color: '#e2e1ee', colorRgb: '226, 225, 238' }
];

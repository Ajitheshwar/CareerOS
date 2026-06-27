import { SystemData } from '../interfaces/node.interface';
import { createStrengthNodes } from '../utils/geometry.utils';

export const SYSTEMS_DATA: SystemData[] = [
  {
    id: 1,
    name: 'CareerOps Platform',
    purpose: 'What I Built',
    description: 'An AI-powered Career Operating System designed to help job seekers with job discovery, resume optimization, interview preparation, career guidance, and application tracking.',
    color: '#00f0ff', // Electric Cyan
    strengthNodes: createStrengthNodes([
      'Resume Intelligence',
      'Job Discovery',
      'Interview Preparation',
      'Career Guidance',
      'Application Tracking'
    ], 150)
  },
  {
    id: 2,
    name: 'Multi-Agent Architecture',
    purpose: 'How I Built It',
    description: 'A multi-agent ecosystem where specialized AI agents collaborate through orchestration workflows to solve career-related tasks.',
    color: '#ffaa00', // Neon Orange
    strengthNodes: createStrengthNodes([
      'Agent Orchestration',
      'Context Sharing',
      'Workflow Intelligence',
      'LangGraph',
      'Multi-Agent Systems'
    ], 150)
  },
  {
    id: 3,
    name: 'Engineering DNA',
    purpose: 'How I Think',
    description: 'The engineering principles and mindset that guide my approach to software design, problem solving, and product development.',
    color: '#c0c1ff', // Indigo
    strengthNodes: createStrengthNodes([
      'Ownership',
      'Execution',
      'Systems Thinking',
      'Performance First',
      'Product Mindset',
      'Continuous Learning'
    ], 160)
  },
  {
    id: 4,
    name: 'Current Exploration',
    purpose: 'What I Am Learning',
    description: 'The technologies, concepts, and ideas I am actively exploring to expand my capabilities as an engineer and AI builder.',
    color: '#00ffaa', // Neon Mint-Teal
    strengthNodes: createStrengthNodes([
      'Agentic AI',
      'Automation',
      'AI Workflows',
      'Developer Productivity',
      'LLM Systems'
    ], 150)
  },
  {
    id: 5,
    name: 'Recruiter Snapshot',
    purpose: 'Quick Professional Summary',
    description: 'A concise overview of my experience, achievements, technical ownership, and current focus.',
    color: '#e2e1ee', // Soft White
    strengthNodes: createStrengthNodes([
      '3+ Years Experience',
      'Enterprise Applications',
      'AI Builder',
      'SDE-II',
      '100+ Components Built',
      'Best Employee Award'
    ], 160)
  }
];

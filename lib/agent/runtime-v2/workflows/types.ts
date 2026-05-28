export type AgentWorkflowQuestionStrategy = {
  maxQuestions: number;
  questionsByField: Record<string, string>;
};

export type AgentWorkflow = {
  name: string;
  description: string;
  stages: string[];
  requiredCreativeFields: string[];
  optionalCreativeFields: string[];
  defaultToolSequence: string[];
  questionStrategy: AgentWorkflowQuestionStrategy;
};

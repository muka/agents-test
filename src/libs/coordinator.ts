import clc from "cli-color";
import { Message } from "multi-llm-ts";
import { Agent, Colors } from "./agent.js";
import { LLM } from "./llm.js";
import { McpTool } from "./mcp/llm-plugin.js";
import { MCPClient } from "./mcp/mcp-client.js";

export type PlanItem = {
  task: string,
  role: string,
}
export type Plan = PlanItem[]

export type ExecutionTrackerItem = {
  step: PlanItem
  messages: Message[]  
  result: string
  ts: Date
}

export type ExecutionTracker = ExecutionTrackerItem[]

export type CoordinatorAgentConfig = {
  agents: Agent[]
  tools?: string[]
  color?: Colors
}

export class AgentCoordinator {

  private mcp: MCPClient
  private llm: LLM

  constructor(private readonly config: CoordinatorAgentConfig) {
    this.llm = new LLM()
  }


  async loadTools() {
    const tools = await this.mcp.listTools()
    this.llm.registerMcpTools(tools as McpTool[], this.mcp)
  }

  async init() {
    
    this.mcp = new MCPClient()
    await this.mcp.init()

    await this.loadTools()
       
    await this.llm.init()
  }

  log(message: string, context?: string) {
    const color = this.config.color || 'cyan'
    console.log(`${clc[color]( `coordinator${context? ' -> ' + context : ''}` )}\n ${message}\n\n`)
  }

  async run(objective: string) {

    const plan = await this.createPlan(objective)
    const results: Message[] = []

    const tracker: ExecutionTracker = []

    for (const step of plan) {
      
      const filter = this.config.agents.filter(a => a.getConfig().role === step.role)
      if (!filter.length) {
        throw new Error(`Agent ${step.role} not found`)
      }

      const agent = filter[0]

      this.log(step.task, step.role)

      const result = await agent.run([
        ...results,
        new Message('user', step.task)
      ])

      agent.log(result, 'task result')

      tracker.push({
        messages: results,
        step,
        result,
        ts: new Date()
      })

      results.push(new Message('user', step.task))
      results.push(new Message('assistant', result))

    }

    return tracker
  }

  async createPlan(objective: string) : Promise<Plan> {

    const messages: Message[] = []

    messages.push(new Message('system', `
You are a software program coordinating autonomous agents capable of performing tasks to reach an objective. 
Your task is to provide precise indications to the agents based on their capabilities and monitor the progresses in subsequent tasks.
The objective is: ${objective}
`))

messages.push(new Message('user', `
Define a plan as a list of activities to reach the objective

The agent available are:
${JSON.stringify(this.config.agents.map(a => ({
  role: a.getConfig().role,
  capabilities: a.getConfig().capabilities,
})))}

Avoid explanations and notes.
Return only the list as JSON without backtick following this format
[{
  "task": "description of the activity",
  "role": "role of the assigned agent"
}]
`))

    const plannerRes = await this.llm.complete(messages)

    this.log(plannerRes.content, 'plan')

    const plan = JSON.parse(plannerRes.content)
    return plan
  }

}

export const createCoordinator = async (config: CoordinatorAgentConfig) => {
  const c = new AgentCoordinator(config)
  await c.init()
  return c
}
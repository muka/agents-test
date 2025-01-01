import YAML from 'js-yaml'
import { createAgent } from './libs/agent.js';
import * as fs from 'fs/promises';
import { createCoordinator } from './libs/coordinator.js';

export const main = async () => {

  const architect = await createAgent({
    role: 'software architect',
    capabilities: 'defines the architecture and provide the implementation steps based on best practices',
    color: 'green'
  })

  const developer = await createAgent({
    role: 'developer',
    capabilities: 'write high-quality, documented and performant code',
    color: 'red'
  })

  const evaluator = await createAgent({
    role: 'evaluate',
    capabilities: 'carefully evaluate code and report improvements',
    color: 'magenta'
  })
 
  const tester = await createAgent({
    role: "tester",
    capabilities: "develop tests based on code and evaluate the quality of response.",
    color: 'yellow'
  })

  const devops = await createAgent({
    role: "dev ops",
    capabilities: "create the deployment infrastructure, providing the Dockerfile and docker compose with the required services",
    color: 'yellow'
  })

  const executor = await createAgent({
    role: "filesystem executor",
    capabilities: "Interact with the filesystem to update the codebase with the agent generated contents.",
    color: 'red',
    // tools: ['read_file', 'write_file', 'create_directory', 'list_directory', 'search_files', 'get_file_info']
  })

  const coordinator = await createCoordinator({
    agents: [
      architect, developer, evaluator, tester, devops, executor
    ],
    color: 'blue',
  })

  const res = await coordinator.run('write a program to create a web-based todo list')

  await fs.mkdir('./tmp', { recursive: true })
  await fs.writeFile(`./tmp/run-${Date.now()}.yaml`, YAML.dump(res))

}

main().catch(e => console.error(e))
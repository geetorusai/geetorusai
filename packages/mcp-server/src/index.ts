import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { GeetorusApiClient } from "./client.js";
import { readConfigFromEnv, type GeetorusMcpConfig } from "./config.js";
import { createToolDefinitions } from "./tools.js";

export function createGeetorusMcpServer(config: GeetorusMcpConfig = readConfigFromEnv()) {
  const server = new McpServer({
    name: "geetorus",
    version: "0.1.0",
  });

  const client = new GeetorusApiClient(config);
  const tools = createToolDefinitions(client);
  for (const tool of tools) {
    server.tool(tool.name, tool.description, tool.schema.shape, tool.execute);
  }

  return {
    server,
    tools,
    client,
  };
}

export async function runServer(config: GeetorusMcpConfig = readConfigFromEnv()) {
  const { server } = createGeetorusMcpServer(config);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

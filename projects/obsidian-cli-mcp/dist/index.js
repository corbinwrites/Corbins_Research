import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { exec } from "child_process";
import { promisify } from "util";
const execAsync = promisify(exec);
const server = new Server({
    name: "obsidian-cli-mcp",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    },
});
async function runObsidianCommand(command, args = {}) {
    let fullCommand = `obsidian ${command}`;
    for (const [key, value] of Object.entries(args)) {
        if (typeof value === "boolean") {
            if (value)
                fullCommand += ` ${key}`;
        }
        else {
            fullCommand += ` ${key}="${value.toString().replace(/"/g, '\\"')}"`;
        }
    }
    try {
        const { stdout, stderr } = await execAsync(fullCommand);
        if (stderr && !stdout) {
            throw new Error(stderr);
        }
        return stdout.trim();
    }
    catch (error) {
        throw new Error(`Obsidian CLI error: ${error.message}`);
    }
}
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "obsidian_read",
                description: "Read a note from Obsidian. Provide 'file' (name) or 'path' (vault relative path).",
                inputSchema: {
                    type: "object",
                    properties: {
                        file: { type: "string", description: "Name of the note (wikilink style)" },
                        path: { type: "string", description: "Vault relative path (e.g. folder/note.md)" },
                    },
                },
            },
            {
                name: "obsidian_create",
                description: "Create a new note in Obsidian.",
                inputSchema: {
                    type: "object",
                    properties: {
                        name: { type: "string", description: "Name of the note" },
                        content: { type: "string", description: "Markdown content" },
                        template: { type: "string", description: "Template name to use" },
                        silent: { type: "boolean", description: "Don't open the file" },
                        overwrite: { type: "boolean", description: "Overwrite existing file" },
                    },
                    required: ["name"],
                },
            },
            {
                name: "obsidian_append",
                description: "Append content to an existing note.",
                inputSchema: {
                    type: "object",
                    properties: {
                        file: { type: "string" },
                        path: { type: "string" },
                        content: { type: "string" },
                    },
                    required: ["content"],
                },
            },
            {
                name: "obsidian_search",
                description: "Search the Obsidian vault.",
                inputSchema: {
                    type: "object",
                    properties: {
                        query: { type: "string" },
                        limit: { type: "number" },
                    },
                    required: ["query"],
                },
            },
            {
                name: "obsidian_eval",
                description: "Execute JavaScript in the Obsidian app context and return result.",
                inputSchema: {
                    type: "object",
                    properties: {
                        code: { type: "string", description: "JS code to execute" },
                    },
                    required: ["code"],
                },
            },
            {
                name: "obsidian_property_set",
                description: "Set a property in a note's frontmatter.",
                inputSchema: {
                    type: "object",
                    properties: {
                        file: { type: "string" },
                        path: { type: "string" },
                        name: { type: "string", description: "Property name" },
                        value: { type: "string", description: "Property value" },
                    },
                    required: ["name", "value"],
                },
            },
            {
                name: "obsidian_backlinks",
                description: "Get backlinks for a note.",
                inputSchema: {
                    type: "object",
                    properties: {
                        file: { type: "string" },
                        path: { type: "string" },
                    },
                },
            },
            {
                name: "obsidian_daily_read",
                description: "Read today's daily note.",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
            {
                name: "obsidian_daily_append",
                description: "Append content to today's daily note.",
                inputSchema: {
                    type: "object",
                    properties: {
                        content: { type: "string" },
                    },
                    required: ["content"],
                },
            },
            {
                name: "obsidian_tasks",
                description: "List tasks from the vault.",
                inputSchema: {
                    type: "object",
                    properties: {
                        query: { type: "string", description: "Task query (e.g. 'daily todo')" },
                    },
                },
            },
            {
                name: "obsidian_tags",
                description: "List tags from the vault.",
                inputSchema: {
                    type: "object",
                    properties: {
                        sort: { type: "string", enum: ["name", "count"] },
                        counts: { type: "boolean" },
                    },
                },
            },
            {
                name: "obsidian_dev_errors",
                description: "Show captured errors from Obsidian.",
                inputSchema: {
                    type: "object",
                    properties: {
                        clear: { type: "boolean" },
                    },
                },
            },
            {
                name: "obsidian_dev_screenshot",
                description: "Take a screenshot of the Obsidian window.",
                inputSchema: {
                    type: "object",
                    properties: {
                        path: { type: "string", description: "Output file path" },
                    },
                    required: ["path"],
                },
            },
        ],
    };
});
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        switch (name) {
            case "obsidian_read":
                return { content: [{ type: "text", text: await runObsidianCommand("read", args) }] };
            case "obsidian_create":
                return { content: [{ type: "text", text: await runObsidianCommand("create", args) }] };
            case "obsidian_append":
                return { content: [{ type: "text", text: await runObsidianCommand("append", args) }] };
            case "obsidian_search":
                return { content: [{ type: "text", text: await runObsidianCommand("search", args) }] };
            case "obsidian_eval":
                return { content: [{ type: "text", text: await runObsidianCommand("eval", args) }] };
            case "obsidian_property_set":
                return { content: [{ type: "text", text: await runObsidianCommand("property:set", args) }] };
            case "obsidian_backlinks":
                return { content: [{ type: "text", text: await runObsidianCommand("backlinks", args) }] };
            case "obsidian_daily_read":
                return { content: [{ type: "text", text: await runObsidianCommand("daily:read", args) }] };
            case "obsidian_daily_append":
                return { content: [{ type: "text", text: await runObsidianCommand("daily:append", args) }] };
            case "obsidian_tasks":
                return { content: [{ type: "text", text: await runObsidianCommand("tasks", args) }] };
            case "obsidian_tags":
                return { content: [{ type: "text", text: await runObsidianCommand("tags", args) }] };
            case "obsidian_dev_errors":
                return { content: [{ type: "text", text: await runObsidianCommand("dev:errors", args) }] };
            case "obsidian_dev_screenshot":
                return { content: [{ type: "text", text: await runObsidianCommand("dev:screenshot", args) }] };
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    }
    catch (error) {
        return {
            content: [{ type: "text", text: error.message }],
            isError: true,
        };
    }
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map
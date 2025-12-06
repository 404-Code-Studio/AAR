import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import { loadEnvFile } from "node:process";
import ollama from 'ollama';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import {markdown} from 'markdown';

// ==================== SETUP ====================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const modulesPath = path.join(__filename, "..", "..", "modules");
const FrontendPath = path.join(__filename, "..", "..", "frontend");

loadEnvFile(path.join(__dirname, "..", ".ENV"));

const logging = process.argv.slice(2) || "default";
const port = process.env.PORT || 3000;
const AGENT_LLM_Model = process.env.DEFAULT_AGENT_LLM;
let modules = [];

// ==================== CONFIGURATION ====================
const SystemLLMPrompt = `You are an AI agent responsible for executing the user's requested tasks.  
You have access to several external modules that allow you to retrieve metadata and control devices or services.

IMPORTANT: When users ask about available modules, functions, or capabilities, you MUST FIRST run:
  /run module list listAllModules

This will show you all available modules, their commands, and capabilities.

To execute a module, use the exact syntax:
  /run module <module_name> <module_function>

Available module types include:
- list: For listing modules and their information (auto-approved)
- time: For getting current time and date
- system: For system information
- crypto: For cryptographic operations
- math: For mathematical calculations
- network: For network operations
- string: For string manipulation
- file: For file operations
- And potentially others

MODULE APPROVAL PROCESS:
- list module: Auto-approved (no user popup)
- All other modules: Require user approval via popup

CRITICAL RULES:
1. When users ask "what modules", "what functions", "what can you do", etc. - IMMEDIATELY respond with EXACTLY: /run module list listAllModules
2. When users ask for time, date, system info, etc. - FIRST respond with: /run module list listAllModules, then after getting result, use appropriate module
3. ALWAYS use the EXACT syntax: /run module <module_name> <module_function> (with forward slash, no parentheses)
4. Do NOT explain what you're going to do - just output the module command directly
5. Wait for module execution result before responding to user
6. Simple operations (string reversal, basic math) can be done by you directly

Examples:
- User: "What modules are available?" → You respond with exactly: /run module list listAllModules
- User: "What time is it?" → You respond with: /run module list listAllModules then after result: /run module time getTime
- User: "What's my device ID?" → You respond with: /run module list listAllModules then after result: /run module system getDeviceId

IMPORTANT: Always use forward slash /run, not (run) or any other format!`;

// ==================== AI SERVICES ====================
class AIService {
  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.geminiModel = this.gemini.getGenerativeModel({ model: "gemini-pro" });
    this.ollama = ollama;
  }

  async getOpenAIResponse(prompt, systemPrompt, moduleOutput = null) {
    if (!prompt) throw new Error('Prompt is required');

    let messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt }
    ];

    // Add module output if provided
    if (moduleOutput) {
      messages.push({ 
        role: "system", 
        content: `Module execution result: ${JSON.stringify(moduleOutput)}` 
      });
      messages.push({ 
        role: "user", 
        content: "Please respond to the user with the module execution result." 
      });
    }

    const model = process.env.OPENAI_MAIN_MODEL || "gpt-4o-mini";
    const completion = await this.openai.chat.completions.create({
      model,
      messages
    });

    return completion.choices[0].message.content;
  }
}

// ==================== MODULE SERVICE ====================
class ModuleService {
  constructor(modulesPath) {
    this.modulesPath = modulesPath;
    this.loadedModules = [];
  }

  async listModules() {
    const files = await fs.readdir(this.modulesPath);
    return files.filter(file => file.endsWith(".js")).map(file => file.slice(0, -3));
  }

  async loadModule(moduleName) {
    try {
      const modulePath = path.join(this.modulesPath, moduleName + ".js");
      const imported = await import(modulePath);
      if (logging === "debug") console.log("[DEBUG] Loaded Module:", moduleName);
      return imported.default || imported;
    } catch (err) {
      console.error(`[ERROR] Failed to load "${moduleName}":`, err);
      return null;
    }
  }

  async runModule(moduleName, commandName) {
    try {
      const module = await this.loadModule(moduleName);
      if (!module?.commands?.[commandName]) {
        console.warn(`[WARN] Command "${commandName}" not found in "${moduleName}"`);
        return { error: `Command "${commandName}" not found in "${moduleName}"` };
      }
      const handler = module.commands[commandName].handler;
      if (typeof handler !== "function") return { error: "Handler is not a function" };
      
      const result = await handler();
      return { success: true, result };
    } catch (err) {
      console.error(`[ERROR] Failed to run "${commandName}" in "${moduleName}":`, err);
      return { error: err.message };
    }
  }

  parseModuleCommand(text) {
    // Use regex to find "/run module <module_name> <command>" or "(run module <module_name> <command>)" anywhere in the text
    const regex = /[\/\(]run\s+module\s+(\w+)\s+(\w+)[\)]?/g;
    const match = regex.exec(text);
    
    if (!match) return null;
    
    console.log(`[DEBUG] Found module command:`, match[0]);
    console.log(`[DEBUG] Module:`, match[1], `Command:`, match[2]);
    
    return {
      module: match[1],
      command: match[2]
    };
  }

  async loadAllModules() {
    const moduleNames = await this.listModules();
    this.loadedModules = moduleNames;
    const loaded = {};
    for (const name of moduleNames) {
      try {
        loaded[name] = await this.loadModule(name);
      } catch (err) {
        console.error(`[ERROR] Failed to load "${name}":`, err);
      }
    }
    return loaded;
  }
}

// ==================== INITIALIZATION ====================
const aiService = new AIService();
const moduleService = new ModuleService(modulesPath);

// ==================== EXPRESS APP ====================
const app = express();
app.use(express.json());
app.use(express.static(FrontendPath));

// ==================== ROUTES ====================
app.get('/', async (req, res) => {
  try {
    const moduleCount = (await moduleService.listModules()).length;
    res.json({ message: 'ARR Backend running', modules: moduleCount });
  } catch (error) {
    res.json({ message: 'ARR Backend running', modules: 0 });
  }
});

app.get('/modules', async (req, res) => {
  try {
    const moduleList = await moduleService.listModules();
    res.json({ modules: moduleList });
  } catch (error) {
    console.error('[ERROR] Failed to list modules:', error);
    res.json({ modules: [] });
  }
});

// Store pending module requests
const pendingModuleRequests = new Map();

app.post('/message', async (req, res) => {
  const { userprompt, typoftask } = req.body;
  
  if (!userprompt || !typoftask) {
    return res.json({ success: false, message: "Missing Fields" });
  }

  console.log("[ROUTE] Message received:", userprompt);

  try {
    let response;
    let moduleOutput = null;

    switch (typoftask) {
      case "llm":
        // Get AI response first
        let aiResponse = await aiService.getOpenAIResponse(userprompt, SystemLLMPrompt);
        
        // Check if AI response contains a module command
        const moduleCommand = moduleService.parseModuleCommand(aiResponse);
        
        if (moduleCommand) {
          console.log(`[MODULE] AI wants to execute: ${moduleCommand.module}.${moduleCommand.command}`);
          
          // Auto-approve list module as it's basic and informational
          if (moduleCommand.module === 'list') {
            console.log(`[MODULE] Auto-approving list module`);
            
            try {
              const moduleOutput = await moduleService.runModule(moduleCommand.module, moduleCommand.command);
              console.log(`[MODULE] List module result:`, moduleOutput);
              
              // Continue with module result
              const nextPrompt = `Original user request: "${userprompt}". 
Module execution result for ${moduleCommand.module}.${moduleCommand.command}: ${JSON.stringify(moduleOutput)}.
Please continue responding to the user's request. If you need to execute more modules, use the /run module syntax again.`;
              
              // Get AI response with module result
              let finalResponse = await aiService.getOpenAIResponse(nextPrompt, SystemLLMPrompt);
              
              // Check if AI wants to execute another module
              const nextModuleCommand = moduleService.parseModuleCommand(finalResponse);
              
              if (nextModuleCommand) {
                // Another module request - create approval request
                const requestId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
                pendingModuleRequests.set(requestId, {
                  module: nextModuleCommand.module,
                  command: nextModuleCommand.command,
                  originalPrompt: userprompt,
                  aiResponse: finalResponse,
                  allModuleOutputs: [{
                    module: moduleCommand.module,
                    command: moduleCommand.command,
                    result: moduleOutput
                  }]
                });
                
                return res.json({ 
                  success: true, 
                  requiresApproval: true,
                  requestId: requestId,
                  module: nextModuleCommand.module,
                  command: nextModuleCommand.command,
                  previousResult: markdown.toHTML(finalResponse),
                  message: "AI requests permission to execute another module."
                });
              }
              
              // No more modules - final response
              res.json({ 
                success: true, 
                message: markdown.toHTML(finalResponse),
                moduleResult: moduleOutput
              });
              
            } catch (error) {
              console.error("[ERROR] List module execution failed:", error);
              res.json({ 
                success: false, 
                message: "List module execution failed: " + error.message 
              });
            }
          } else {
            // Generate unique request ID for non-list modules
            const requestId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
            
            // Store the request for later approval
            pendingModuleRequests.set(requestId, {
              module: moduleCommand.module,
              command: moduleCommand.command,
              originalPrompt: userprompt,
              aiResponse: aiResponse,
              allModuleOutputs: []
            });
            
            // Return module approval request
            return res.json({ 
              success: true, 
              requiresApproval: true,
              requestId: requestId,
              module: moduleCommand.module,
              command: moduleCommand.command,
              message: "AI requests permission to execute a module. Please approve or deny."
            });
          }
        } else {
          // No module command found, return AI response directly
          res.json({ success: true, message: markdown.toHTML(aiResponse) });
        }
        break;
      default:
        res.json({ success: false, message: "Unknown task type" });
    }
  } catch (error) {
    console.error("[ERROR] Message processing failed:", error);
    res.json({ success: false, message: "Internal Server Error" });
  }
});

app.post('/approve-module', async (req, res) => {
  const { requestId, approved } = req.body;
  
  if (!requestId) {
    return res.json({ success: false, message: "Missing request ID" });
  }
  
  const pendingRequest = pendingModuleRequests.get(requestId);
  if (!pendingRequest) {
    return res.json({ success: false, message: "Request not found or expired" });
  }
  
  // Remove from pending requests
  pendingModuleRequests.delete(requestId);
  
  if (!approved) {
    return res.json({ 
      success: true, 
      message: "Module execution denied by user.",
      denied: true 
    });
  }
  
  try {
    // Execute the approved module
    const moduleOutput = await moduleService.runModule(pendingRequest.module, pendingRequest.command);
    console.log(`[MODULE] Approved execution result:`, moduleOutput);
    
    // Continue the AI conversation with the module result
    const updatedModuleOutputs = [...pendingRequest.allModuleOutputs, {
      module: pendingRequest.module,
      command: pendingRequest.command,
      result: moduleOutput
    }];
    
    // Update prompt to include the module result for next iteration
    const nextPrompt = `Original user request: "${pendingRequest.originalPrompt}". 
Module execution result for ${pendingRequest.module}.${pendingRequest.command}: ${JSON.stringify(moduleOutput)}.
Please continue responding to the user's request. If you need to execute more modules, use the /run module syntax again.`;
    
    // Get AI response with module result
    let finalResponse = await aiService.getOpenAIResponse(nextPrompt, SystemLLMPrompt);
    
    // Check if AI wants to execute another module
    const nextModuleCommand = moduleService.parseModuleCommand(finalResponse);
    
    if (nextModuleCommand) {
      // Auto-approve list module
      if (nextModuleCommand.module === 'list') {
        console.log(`[MODULE] Auto-approving list module in approval flow`);
        
        try {
          const listModuleOutput = await moduleService.runModule(nextModuleCommand.module, nextModuleCommand.command);
          console.log(`[MODULE] List module result:`, listModuleOutput);
          
          const newUpdatedModuleOutputs = [...updatedModuleOutputs, {
            module: nextModuleCommand.module,
            command: nextModuleCommand.command,
            result: listModuleOutput
          }];
          
          // Continue with list module result
          const nextPrompt = `Original user request: "${pendingRequest.originalPrompt}". 
Module execution result for ${nextModuleCommand.module}.${nextModuleCommand.command}: ${JSON.stringify(listModuleOutput)}.
Please continue responding to the user's request. If you need to execute more modules, use the /run module syntax again.`;
          
          // Get AI response with list module result
          let nextFinalResponse = await aiService.getOpenAIResponse(nextPrompt, SystemLLMPrompt);
          
          // Check if AI wants to execute yet another module
          const yetAnotherModuleCommand = moduleService.parseModuleCommand(nextFinalResponse);
          
          if (yetAnotherModuleCommand) {
            // Create approval request for non-list module
            const newRequestId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
            pendingModuleRequests.set(newRequestId, {
              module: yetAnotherModuleCommand.module,
              command: yetAnotherModuleCommand.command,
              originalPrompt: pendingRequest.originalPrompt,
              aiResponse: nextFinalResponse,
              allModuleOutputs: newUpdatedModuleOutputs
            });
            
            return res.json({ 
              success: true, 
              requiresApproval: true,
              requestId: newRequestId,
              module: yetAnotherModuleCommand.module,
              command: yetAnotherModuleCommand.command,
              previousResult: markdown.toHTML(nextFinalResponse),
              message: "AI requests permission to execute another module."
            });
          }
          
          // No more modules - final response
          return res.json({ 
            success: true, 
            message: markdown.toHTML(nextFinalResponse),
            moduleResult: listModuleOutput
          });
          
        } catch (error) {
          console.error("[ERROR] List module execution failed:", error);
          return res.json({ 
            success: false, 
            message: "List module execution failed: " + error.message 
          });
        }
      } else {
        // Create approval request for non-list module
        const newRequestId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        pendingModuleRequests.set(newRequestId, {
          module: nextModuleCommand.module,
          command: nextModuleCommand.command,
          originalPrompt: pendingRequest.originalPrompt,
          aiResponse: finalResponse,
          allModuleOutputs: updatedModuleOutputs
        });
        
        return res.json({ 
          success: true, 
          requiresApproval: true,
          requestId: newRequestId,
          module: nextModuleCommand.module,
          command: nextModuleCommand.command,
          previousResult: markdown.toHTML(finalResponse),
          message: "AI requests permission to execute another module."
        });
      }
    }
    
    // No more modules - final response
    res.json({ 
      success: true, 
      message: markdown.toHTML(finalResponse),
      moduleResult: moduleOutput
    });
    
  } catch (error) {
    console.error("[ERROR] Module execution failed:", error);
    res.json({ 
      success: false, 
      message: "Module execution failed: " + error.message 
    });
  }
});

// ==================== STARTUP ====================
(async () => {
  try {
    modules = await moduleService.listModules();
    await moduleService.loadAllModules();

    app.listen(port, () => {
      console.log(`🚀 ARR Backend on port ${port}`);
      console.log(`📦 ${modules.length} modules loaded`);
      console.log(`🤖 AI: Ollama, Gemini, OpenAI ready`);
    });
  } catch (error) {
    console.error("[FATAL] Failed to start server:", error);
    process.exit(1);
  }
})();
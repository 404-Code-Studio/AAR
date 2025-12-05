
module.exports = {
  id: "ollama_adapter",
  name: "Ollama Adapter",
  description: "Adapter module to interact with Ollama AI models",
  capabilities: ["READ", "WRITE"], // READ for querying models, WRITE if it triggers actions

  commands: {
    getModels: {
      description: "Returns a list of available Ollama models",
      handler: async () => {
        // In a real implementation, you could call the Ollama CLI or API:
        // const models = await ollama.listModels();
        // return models;
        return ["llama2", "alpaca", "mistral"]; // placeholder
      }
    },

    generateText: {
      description: "Generates text from a specific Ollama model",
      // args: { model: string, prompt: string }
      handler: async (args) => {
        const { model, prompt } = args;

        // placeholder for actual call to Ollama
        // const result = await ollama.generate(model, prompt);
        return "Hello world!"; 
      }
    }
  }
};

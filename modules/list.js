module.exports = {
  id: "list",
  name: "Listing Module",
  capabilities: ["READ"],

  commands: {
    listAllModules: {
      description: "Returns all Module names with their commands and capabilities",
      handler: async () => {
        const fs = await import('fs');
        const path = await import('path');
        const modulesPath = path.join(process.cwd(), '..', 'modules');
        const files = fs.readdirSync(modulesPath);
        const moduleFiles = files.filter(file => file.endsWith('.js'));
        
        const modules = [];
        
        for (const file of moduleFiles) {
          try {
            const modulePath = path.join(modulesPath, file);
            const moduleData = await import(modulePath);
            const module = moduleData.default || moduleData;
            
            const moduleInfo = {
              name: module.name || file.slice(0, -3),
              id: module.id || file.slice(0, -3),
              capabilities: module.capabilities || [],
              commands: {}
            };
            
            // Extract command information
            if (module.commands) {
              for (const [commandName, commandData] of Object.entries(module.commands)) {
                moduleInfo.commands[commandName] = {
                  description: commandData.description || "No description available"
                };
              }
            }
            
            modules.push(moduleInfo);
          } catch (err) {
            console.error(`[ERROR] Failed to load module "${file}":`, err);
            modules.push({
              name: file.slice(0, -3),
              id: file.slice(0, -3),
              capabilities: [],
              commands: {},
              error: "Failed to load module"
            });
          }
        }
        
        return modules;
      }
    },
  }
};

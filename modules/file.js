module.exports = {
  id: "file",
  name: "File Module",
  capabilities: ["READ", "WRITE"],

  commands: {
    getFileStats: {
      description: "Gets file statistics",
      handler: async (filePath) => {
        const fs = await import('fs');
        try {
          const stats = fs.statSync(filePath);
          return {
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            isFile: stats.isFile(),
            isDirectory: stats.isDirectory()
          };
        } catch (error) {
          return { error: error.message };
        }
      }
    },
    readFile: {
      description: "Reads file content",
      handler: async (filePath) => {
        const fs = await import('fs');
        try {
          return fs.readFileSync(filePath, 'utf8');
        } catch (error) {
          return { error: error.message };
        }
      }
    },
    writeFile: {
      description: "Writes content to a file",
      handler: async (filePath, content) => {
        const fs = await import('fs');
        try {
          fs.writeFileSync(filePath, content, 'utf8');
          return { success: true, message: "File written successfully" };
        } catch (error) {
          return { error: error.message };
        }
      }
    }
  }
};
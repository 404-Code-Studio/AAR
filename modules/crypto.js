module.exports = {
  id: "crypto",
  name: "Crypto Module",
  capabilities: ["READ", "WRITE"],

  commands: {
    generateUUID: {
      description: "Generates a random UUID",
      handler: async () => {
        const crypto = await import('crypto');
        return crypto.randomUUID();
      }
    },
    hashString: {
      description: "Hashes a string using SHA-256",
      handler: async (text) => {
        const crypto = await import('crypto');
        return crypto.createHash('sha256').update(text).digest('hex');
      }
    },
    generateRandomToken: {
      description: "Generates a random token of specified length",
      handler: async (length = 32) => {
        const crypto = await import('crypto');
        return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
      }
    }
  }
};
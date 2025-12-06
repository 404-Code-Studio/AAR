module.exports = {
  id: "string",
  name: "String Module",
  capabilities: ["READ", "WRITE"],

  commands: {
    reverseString: {
      description: "Reverses a string",
      handler: async (text) => text.split('').reverse().join('')
    },
    toCamelCase: {
      description: "Converts string to camelCase",
      handler: async (text) => {
        return text.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
          return index === 0 ? word.toLowerCase() : word.toUpperCase();
        }).replace(/\s+/g, '');
      }
    },
    generatePassword: {
      description: "Generates a secure password",
      handler: async (length = 12) => {
        const crypto = await import('crypto');
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < length; i++) {
          const randomIndex = crypto.randomBytes(1)[0] % charset.length;
          password += charset[randomIndex];
        }
        return password;
      }
    },
    wordCount: {
      description: "Counts words in a string",
      handler: async (text) => {
        if (!text.trim()) return 0;
        return text.trim().split(/\s+/).length;
      }
    }
  }
};
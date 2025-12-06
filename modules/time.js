module.exports = {
  id: "time",
  name: "Time Module",
  capabilities: ["READ"],

  commands: {
    getTime: {
      description: "Returns the current time",
      handler: async () => new Date().toLocaleTimeString()
    },
    getDate: {
      description: "Returns the current date",
      handler: async () => new Date().toLocaleDateString()
    }
  }
};

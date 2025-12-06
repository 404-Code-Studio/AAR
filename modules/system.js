module.exports = {
  id: "system",
  name: "System Module",
  capabilities: ["READ"],

  commands: {
    getDeviceId: {
      description: "Returns the Device ID",
      handler: async () =>  "HI"
    },
  }
};

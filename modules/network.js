module.exports = {
  id: "network",
  name: "Network Module",
  capabilities: ["READ"],

  commands: {
    checkConnection: {
      description: "Checks if internet connection is available",
      handler: async () => {
        try {
          const https = await import('https');
          return new Promise((resolve) => {
            const req = https.request('https://www.google.com', (res) => {
              resolve(res.statusCode === 200);
            });
            req.on('error', () => resolve(false));
            req.setTimeout(3000, () => {
              req.destroy();
              resolve(false);
            });
            req.end();
          });
        } catch (error) {
          return false;
        }
      }
    },
    getLocalIP: {
      description: "Gets local IP address",
      handler: async () => {
        const os = await import('os');
        const interfaces = os.networkInterfaces();
        for (const name of Object.keys(interfaces)) {
          for (const interface of interfaces[name]) {
            if (interface.family === 'IPv4' && !interface.internal) {
              return interface.address;
            }
          }
        }
        return '127.0.0.1';
      }
    }
  }
};
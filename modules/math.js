module.exports = {
  id: "math",
  name: "Math Module",
  capabilities: ["READ"],

  commands: {
    fibonacci: {
      description: "Calculates the nth Fibonacci number",
      handler: async (n) => {
        if (n <= 0) return 0;
        if (n <= 1) return n;
        let a = 0, b = 1;
        for (let i = 2; i <= n; i++) {
          [a, b] = [b, a + b];
        }
        return b;
      }
    },
    isPrime: {
      description: "Checks if a number is prime",
      handler: async (num) => {
        if (num <= 1) return false;
        if (num <= 3) return true;
        if (num % 2 === 0 || num % 3 === 0) return false;
        for (let i = 5; i * i <= num; i += 6) {
          if (num % i === 0 || num % (i + 2) === 0) return false;
        }
        return true;
      }
    },
    factorial: {
      description: "Calculates factorial of a number",
      handler: async (n) => {
        if (n < 0) return "Error: Negative number";
        if (n === 0 || n === 1) return 1;
        let result = 1;
        for (let i = 2; i <= n; i++) {
          result *= i;
        }
        return result;
      }
    }
  }
};
import path from "path";
import { fileURLToPath } from "url";
import { loadEnvFile } from "node:process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
loadEnvFile(path.join(__dirname, "..", ".ENV"));

// ============================================
// DUCKDUCKGO INSTANT ANSWER API
// ============================================
async function searchWithDuckDuckGo(query) {
  try {
    console.log(`[DDG] Searching for: "${query}"`);
    
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`DuckDuckGo API returned status ${response.status}`);
    }

    const data = await response.json();
    
    console.log(`[DDG] Response received:`, {
      hasAbstract: !!data.Abstract,
      hasRelatedTopics: data.RelatedTopics?.length > 0,
      hasResults: data.Results?.length > 0
    });

    // Baue formatierte Antwort
    let formattedResult = '';
    const sources = [];
    
    // Haupt-Abstract
    if (data.Abstract) {
      formattedResult += `📋 ${data.Abstract}\n\n`;
      if (data.AbstractURL) {
        sources.push({
          title: data.AbstractSource || 'Source',
          url: data.AbstractURL,
          type: 'abstract'
        });
        formattedResult += `📌 Quelle: ${data.AbstractSource || 'Unknown'}\n`;
        formattedResult += `🔗 ${data.AbstractURL}\n\n`;
      }
    }
    
    // Related Topics
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      formattedResult += '📚 Weitere Informationen:\n\n';
      
      let topicCount = 0;
      for (const topic of data.RelatedTopics) {
        if (topicCount >= 5) break;
        
        if (topic.Text && topic.FirstURL) {
          topicCount++;
          formattedResult += `${topicCount}. ${topic.Text}\n`;
          formattedResult += `   🔗 ${topic.FirstURL}\n\n`;
          
          sources.push({
            title: topic.Text.substring(0, 100),
            url: topic.FirstURL,
            type: 'related'
          });
        }
      }
    }
    
    // Results (falls vorhanden)
    if (data.Results && data.Results.length > 0) {
      if (!formattedResult) {
        formattedResult += '🔍 Suchergebnisse:\n\n';
      }
      
      data.Results.slice(0, 3).forEach((result, i) => {
        formattedResult += `${i + 1}. ${result.Text}\n`;
        if (result.FirstURL) {
          formattedResult += `   🔗 ${result.FirstURL}\n\n`;
          sources.push({
            title: result.Text,
            url: result.FirstURL,
            type: 'result'
          });
        }
      });
    }

    // Wenn gar nichts gefunden wurde
    if (!formattedResult || formattedResult.trim().length === 0) {
      formattedResult = `ℹ️ Keine detaillierten Ergebnisse für "${query}" gefunden.\n\n`;
      formattedResult += `💡 Tipps:\n`;
      formattedResult += `- Versuche spezifischere Suchbegriffe\n`;
      formattedResult += `- Nutze englische Begriffe für bessere Ergebnisse\n`;
      formattedResult += `- Suche nach bekannten Begriffen oder Namen\n\n`;
      formattedResult += `🔗 Direkte DuckDuckGo Suche: https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
    }

    return {
      success: true,
      service: "duckduckgo",
      query: query,
      result: formattedResult,
      sources: sources,
      rawData: {
        hasAbstract: !!data.Abstract,
        hasRelatedTopics: data.RelatedTopics?.length > 0,
        hasResults: data.Results?.length > 0,
        heading: data.Heading,
        abstractSource: data.AbstractSource
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error("[DDG] Search error:", error);
    
    return {
      success: false,
      error: `DuckDuckGo search failed: ${error.message}`,
      query: query,
      fallbackUrl: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
      timestamp: new Date().toISOString()
    };
  }
}

// ============================================
// HELPER: Test-Funktion
// ============================================
async function testSearch() {
  console.log("\n=== Testing DuckDuckGo Search ===\n");
  
  const testQueries = [
    "steam",
    "Node.js",
    "Berlin weather",
    "Albert Einstein"
  ];
  
  for (const query of testQueries) {
    console.log(`\n--- Testing: "${query}" ---`);
    const result = await searchWithDuckDuckGo(query);
    
    if (result.success) {
      console.log("✅ Success");
      console.log("Result preview:", result.result.substring(0, 200) + "...");
      console.log("Sources found:", result.sources.length);
    } else {
      console.log("❌ Failed:", result.error);
    }
  }
}

// ============================================
// MODULE EXPORT
// ============================================
export default {
  id: "websearch",
  name: "Web Search Module (DuckDuckGo)",
  version: "2.0.0",
  capabilities: ["READ", "SEARCH"],
  description: "Simple, reliable web search using DuckDuckGo Instant Answer API (no API key required)",

  commands: {
    search: {
      description: "Search the web using DuckDuckGo Instant Answer API",
      usage: "search <query>",
      examples: [
        "search Node.js",
        "search Albert Einstein",
        "search Python programming",
        "search Berlin weather"
      ],
      handler: async (query) => {
        // Validierung
        if (!query || typeof query !== 'string' || query.trim().length === 0) {
          return { 
            error: "Search query is required",
            usage: "search <your query here>",
            examples: [
              "search Node.js",
              "search Einstein"
            ]
          };
        }

        // Suche durchführen
        console.log(`[WEBSEARCH] Starting search for: "${query}"`);
        const result = await searchWithDuckDuckGo(query.trim());
        
        if (result.success) {
          console.log(`[WEBSEARCH] ✅ Search successful - ${result.sources.length} sources found`);
        } else {
          console.log(`[WEBSEARCH] ❌ Search failed: ${result.error}`);
        }
        
        return result;
      }
    },

    status: {
      description: "Check search service status",
      handler: async () => {
        try {
          // Test-Ping zur API
          const testResult = await searchWithDuckDuckGo("test");
          
          return {
            service: "DuckDuckGo Instant Answer API",
            status: testResult.success ? "✅ Online" : "❌ Offline",
            apiEndpoint: "https://api.duckduckgo.com/",
            apiKeyRequired: false,
            features: [
              "Instant answers",
              "Related topics",
              "Wikipedia abstracts",
              "No rate limits",
              "No authentication needed"
            ],
            limitations: [
              "Limited to instant answers (not full web results)",
              "Best for factual queries (people, places, concepts)",
              "May return empty for very specific/niche queries"
            ],
            tips: [
              "Use well-known terms for best results",
              "Try English terms if German queries don't work",
              "Good for: definitions, people, places, concepts",
              "Less good for: current news, product searches"
            ]
          };
        } catch (error) {
          return {
            service: "DuckDuckGo",
            status: "❌ Error",
            error: error.message
          };
        }
      }
    },

    test: {
      description: "Run test searches to verify functionality",
      handler: async () => {
        console.log("\n=== Running Web Search Tests ===\n");
        
        const testQueries = [
          { query: "steam", expect: "Should find Steam platform info" },
          { query: "Node.js", expect: "Should find Node.js info" },
          { query: "Einstein", expect: "Should find Einstein bio" }
        ];
        
        const results = [];
        
        for (const test of testQueries) {
          console.log(`\nTesting: "${test.query}"`);
          const result = await searchWithDuckDuckGo(test.query);
          
          results.push({
            query: test.query,
            success: result.success,
            sourcesFound: result.sources?.length || 0,
            hasContent: result.result && result.result.length > 50,
            expected: test.expect
          });
          
          console.log(result.success ? "✅ Pass" : "❌ Fail");
        }
        
        const passedTests = results.filter(r => r.success && r.hasContent).length;
        
        return {
          totalTests: testQueries.length,
          passed: passedTests,
          failed: testQueries.length - passedTests,
          results: results,
          status: passedTests === testQueries.length ? "✅ All tests passed" : "⚠️ Some tests failed"
        };
      }
    },

    help: {
      description: "Show detailed help about web search",
      handler: async () => {
        return {
          module: "Web Search",
          service: "DuckDuckGo Instant Answer API",
          
          commands: {
            "search <query>": "Search for information",
            "status": "Check if search is working",
            "test": "Run test searches",
            "help": "Show this help"
          },
          
          examples: [
            { command: "search Steam", description: "Find info about Steam platform" },
            { command: "search Node.js features", description: "Learn about Node.js" },
            { command: "search Albert Einstein", description: "Get Einstein biography" },
            { command: "search Python programming", description: "Info about Python" }
          ],
          
          tips: [
            "✅ Best for: famous people, places, concepts, definitions",
            "✅ Works great with: single topics, well-known terms",
            "⚠️ Limited for: very new events, niche topics, product searches",
            "💡 Tip: Use clear, specific terms in English for best results"
          ],
          
          technicalInfo: {
            api: "DuckDuckGo Instant Answer API",
            endpoint: "https://api.duckduckgo.com/",
            authentication: "None required",
            rateLimit: "None",
            cost: "Free forever"
          }
        };
      }
    }
  }
};

// Uncomment to run tests:
// testSearch().then(() => console.log("\n=== Tests complete ===\n"));
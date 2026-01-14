/**
 * Test script to identify substation and count transformers at Clare Solar Farm
 */

import { invokeLLM } from "../server/_core/llm";
import { ENV } from "../server/_core/env";

async function fetchSatelliteImage(lat: number, lon: number, zoom: number): Promise<string> {
  const baseUrl = ENV.forgeApiUrl?.replace(/\/+$/, "") || "";
  const apiKey = ENV.forgeApiKey || "";
  const size = "640x640";
  const mapType = "satellite";
  return `${baseUrl}/v1/maps/proxy/maps/api/staticmap?center=${lat},${lon}&zoom=${zoom}&size=${size}&maptype=${mapType}&key=${apiKey}`;
}

async function identifySubstation() {
  console.log("🔍 Testing Substation Detection at Clare Solar Farm");
  console.log("=" .repeat(70));
  
  const siteName = "Clare Solar Farm";
  const lat = -19.8397;
  const lon = 147.208;
  
  console.log(`Starting coordinates: ${lat}, ${lon}`);
  
  // Start with wide view
  const zoom16Url = await fetchSatelliteImage(lat, lon, 16);
  
  const systemPrompt = `You are an expert electrical engineer analyzing solar farm infrastructure.

Your task is to locate the substation at ${siteName} and analyze its equipment.

**What to look for:**
- Substations are typically located at the edge or corner of solar farms
- They contain large transformers (appear as rectangular structures)
- Usually have switchgear, control buildings, and transmission lines
- Often surrounded by security fencing
- Connected to high-voltage transmission lines leaving the site

**Your analysis steps:**
1. Scan the initial wide view to locate the substation area
2. Request closer zoom images to examine the substation in detail
3. Count the number of large power transformers (these are the biggest equipment items)
4. Describe what you see and provide your transformer count

**Important:**
- Transformers are large rectangular units, typically 3-5m × 2-3m each
- At zoom 19-20, you should be able to distinguish individual transformers
- Don't confuse smaller equipment (switchgear, control cabinets) with transformers`;

  const tools = [
    {
      type: "function" as const,
      function: {
        name: "fetch_satellite_image",
        description: "Fetch a satellite image at specific coordinates and zoom level",
        parameters: {
          type: "object",
          properties: {
            latitude: { type: "number", description: "Latitude in decimal degrees" },
            longitude: { type: "number", description: "Longitude in decimal degrees" },
            zoom: { type: "number", description: "Zoom level (16=wide, 18=medium, 20=detailed)" },
            reason: { type: "string", description: "Why you want this image" }
          },
          required: ["latitude", "longitude", "zoom", "reason"]
        }
      }
    },
    {
      type: "function" as const,
      function: {
        name: "submit_findings",
        description: "Submit your findings about the substation",
        parameters: {
          type: "object",
          properties: {
            substationLat: { type: "number", description: "Latitude of substation center" },
            substationLon: { type: "number", description: "Longitude of substation center" },
            transformerCount: { type: "integer", description: "Number of large power transformers identified" },
            confidence: { type: "integer", description: "Confidence in count (0-100)" },
            description: { type: "string", description: "Description of what you observed" }
          },
          required: ["substationLat", "substationLon", "transformerCount", "confidence", "description"]
        }
      }
    }
  ];

  const messages: Array<any> = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: [
        { type: "text", text: `Here is a wide view of Clare Solar Farm at coordinates ${lat}, ${lon}. The substation is typically at the edge of the solar farm, often in a corner. Look for a fenced area with large equipment and transmission lines. Once you locate it, zoom in to count the transformers.` },
        { type: "image_url", image_url: { url: zoom16Url } }
      ]
    }
  ];

  let result: any = null;
  const maxIterations = 8;

  for (let i = 1; i <= maxIterations; i++) {
    console.log(`\n📡 Iteration ${i}/${maxIterations}`);
    
    try {
      const response = await invokeLLM({
        messages,
        tools,
        tool_choice: "auto"
      });

      const choice = response.choices[0];
      const message = choice.message;

      console.log(`   Finish reason: ${choice.finish_reason}`);
      if (message.content) {
        const contentStr = typeof message.content === 'string' ? message.content : JSON.stringify(message.content);
        console.log(`   Message: ${contentStr.substring(0, 200)}...`);
      }

      messages.push({ role: "assistant", content: message.content || "" });

      if (message.tool_calls && message.tool_calls.length > 0) {
        for (const toolCall of message.tool_calls) {
          const functionName = toolCall.function.name;
          const args = JSON.parse(toolCall.function.arguments);

          console.log(`🔧 Function call: ${functionName}`);
          console.log(`   Args:`, args);

          if (functionName === "fetch_satellite_image") {
            const { latitude, longitude, zoom, reason } = args;
            console.log(`   Reason: ${reason}`);
            
            const imageUrl = await fetchSatelliteImage(latitude, longitude, zoom);
            messages.push({
              role: "user",
              content: [
                { type: "text", text: `Image at (${latitude}, ${longitude}) zoom ${zoom}:` },
                { type: "image_url", image_url: { url: imageUrl } }
              ]
            });
          } else if (functionName === "submit_findings") {
            console.log(`✅ Findings submitted!`);
            result = args;
            break;
          }
        }

        if (result) break;
      } else {
        console.log(`⚠️  LLM finished without submitting findings`);
        break;
      }
    } catch (error) {
      console.error(`❌ Error in iteration ${i}:`, error);
      break;
    }
  }

  if (!result) {
    console.log("\n❌ Failed to complete analysis");
    return;
  }

  console.log("\n✅ SUBSTATION ANALYSIS COMPLETE!");
  console.log("=" .repeat(70));
  console.log(`📍 LOCATION:`);
  console.log(`  Latitude: ${result.substationLat}°`);
  console.log(`  Longitude: ${result.substationLon}°`);
  console.log(`\n⚡ TRANSFORMERS:`);
  console.log(`  Count: ${result.transformerCount}`);
  console.log(`  Confidence: ${result.confidence}%`);
  console.log(`\n📝 DESCRIPTION:`);
  console.log(`  ${result.description}`);
}

identifySubstation().catch(console.error);

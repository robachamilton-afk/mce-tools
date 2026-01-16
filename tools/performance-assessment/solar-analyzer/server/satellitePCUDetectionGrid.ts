/**
 * Grid-based PCU detection from satellite imagery
 * Systematically scans site in grid pattern for predictable iteration count
 */

import { invokeLLM } from "./_core/llm";
import { ENV } from "./_core/env";

interface GridCell {
  row: number;
  col: number;
  centerLat: number;
  centerLon: number;
  pcuCount: number;
  hasRoads: boolean;
  hasPanels: boolean;
}

interface PCUDetectionResult {
  pcuCount: number;
  inverterCount: number;
  detectionConfidence: number;
  detectionNotes: string;
  imagesAnalyzed: number;
  gridCells: GridCell[];
}

async function fetchSatelliteImage(lat: number, lon: number, zoom: number): Promise<string> {
  const baseUrl = ENV.forgeApiUrl?.replace(/\/+$/, "") || "";
  const apiKey = ENV.forgeApiKey || "";
  const size = "640x640";
  const mapType = "satellite";
  return `${baseUrl}/v1/maps/proxy/maps/api/staticmap?center=${lat},${lon}&zoom=${zoom}&size=${size}&maptype=${mapType}&key=${apiKey}`;
}



export async function detectPCUsGrid(
  siteName: string,
  centerLat: number,
  centerLon: number,
  boundingBox: { minLat: number, maxLat: number, minLon: number, maxLon: number },
  estimatedSizeKm: { width: number, height: number }
): Promise<PCUDetectionResult> {
  
  // Calculate grid size based on actual site dimensions
  // Each cell covers ~770m at zoom 17
  const cellSizeKm = 0.770;
  const overlapPercent = 0.30; // 30% overlap between adjacent cells
  const effectiveCellSize = cellSizeKm * (1 - overlapPercent); // ~134m effective spacing
  
  const gridWidth = Math.ceil(estimatedSizeKm.width / effectiveCellSize);
  const gridHeight = Math.ceil(estimatedSizeKm.height / effectiveCellSize);
  
  // Limit grid size for practicality
  const maxGridDim = 12; // Max 12×12 = 144 cells
  const finalGridWidth = Math.min(gridWidth, maxGridDim);
  const finalGridHeight = Math.min(gridHeight, maxGridDim);
  
  console.log(`📏 Site dimensions: ${estimatedSizeKm.width.toFixed(2)}km × ${estimatedSizeKm.height.toFixed(2)}km`);
  console.log(`📊 Calculated grid: ${finalGridWidth} × ${finalGridHeight} cells`);
  
  // Generate overlapping grid cells within bounding box
  const latRange = boundingBox.maxLat - boundingBox.minLat;
  const lonRange = boundingBox.maxLon - boundingBox.minLon;
  
  // Calculate step size with overlap
  const latStepEffective = latRange / finalGridHeight;
  const lonStepEffective = lonRange / finalGridWidth;
  
  const overlapDistanceKm = cellSizeKm * overlapPercent;
  const overlapDistanceM = Math.round(overlapDistanceKm * 1000);
  
  console.log(`🔗 Overlap: ${(overlapPercent * 100).toFixed(0)}% (~${overlapDistanceM}m between adjacent cells)`);
  
  const gridCells: Array<{row: number, col: number, lat: number, lon: number}> = [];
  for (let row = 0; row < finalGridHeight; row++) {
    for (let col = 0; col < finalGridWidth; col++) {
      gridCells.push({
        row,
        col,
        lat: boundingBox.minLat + (row + 0.5) * latStepEffective,
        lon: boundingBox.minLon + (col + 0.5) * lonStepEffective
      });
    }
  }
  const totalCells = gridCells.length;
  
  console.log(`📍 Site: ${siteName}`);
  console.log(`📊 Grid: ${finalGridWidth}×${finalGridHeight} = ${totalCells} cells (calibrated to site boundaries)`);
  
  const gridMap = Array.from({length: finalGridHeight}, (_, row) => 
    Array.from({length: finalGridWidth}, (_, col) => `[${row},${col}]`).join(' ')
  ).join('\n');
  
  const systemPrompt = `You are analyzing satellite imagery of ${siteName} solar farm using a systematic grid scan.

**GRID LAYOUT:**

The site is divided into a ${finalGridWidth}×${finalGridHeight} grid (${totalCells} cells total):

${gridMap}

- Cell [0,0] is the SOUTHWEST corner
- Cell [${finalGridHeight-1},${finalGridWidth-1}] is the NORTHEAST corner
- Rows increase northward (0 → ${finalGridHeight-1})
- Columns increase eastward (0 → ${finalGridWidth-1})
- **IMPORTANT: Adjacent cells overlap by ~${overlapDistanceM}m (${(overlapPercent*100).toFixed(0)}%)**
  - A PCU near the edge of cell [2,3] will also appear in cells [2,2], [2,4], [1,3], or [3,3]
  - When you see the same PCU in multiple cells, only count it ONCE in your total

**GRID SCANNING PROCESS:**

You will be shown ${totalCells} images, one for each grid cell covering the site.
For EACH image, you must:

1. **Count PCUs** - Look for white/grey rectangular containers (~12m × 2.4m)
   - At zoom 17: PCUs are ~10 pixels long, ~2 pixels wide (small but visible)
   - **KEY PATTERN: PCUs sit in "cut-outs" or gaps in the panel array**
   - Look for: regular panel rows → gap/cleared space → white rectangle → gap → panel rows resume
   - PCUs are ALWAYS along access roads, never in the middle of arrays
   - Count carefully - don't miss any, don't double-count

2. **Note roads** - Are there access roads visible in this cell?

3. **Note panels** - Are there solar panels in this cell?

**What PCUs look like at zoom 17:**
- **Bright white or light grey rectangular containers** (much brighter than dark blue/black panels)
- ~10 pixels long × 2 pixels wide (very small - look for brightness contrast and gap pattern)
- **Located in gaps/cut-outs in the panel array** - panels stop, PCU sits in cleared space, panels resume
- Always positioned along access roads (dirt/gravel roads between panel blocks)
- Evenly spaced along roads (not clustered randomly)
- Cast rectangular shadows
- May have visible cooling equipment or radiators on sides
- Distinct from panels: panels are darker, in regular rows, PCUs interrupt those rows

**Important:**
- Each image is a different part of the site
- Count PCUs in EACH image separately
- **DO NOT double-count** - if a PCU appears in multiple adjacent cells, only count it ONCE
- Some cells may have 0 PCUs (especially edge cells outside the farm)
- Some cells may have 2-5 PCUs
- Build a mental map as you go - track which areas you've seen
- Be systematic and thorough

After analyzing ALL ${totalCells} images, submit your results with the total count and per-cell breakdown.`;

  const tools = [
    {
      type: "function" as const,
      function: {
        name: "submit_grid_analysis",
        description: `Submit your analysis after reviewing all ${totalCells} grid cells`,
        parameters: {
          type: "object",
          properties: {
            gridCells: {
              type: "array",
              description: "Analysis for each grid cell",
              items: {
                type: "object",
                properties: {
                  row: { type: "integer", description: "Grid row (0-indexed)" },
                  col: { type: "integer", description: "Grid column (0-indexed)" },
                  pcuCount: { type: "integer", description: "Number of PCUs in this cell" },
                  hasRoads: { type: "boolean", description: "Are there roads in this cell?" },
                  hasPanels: { type: "boolean", description: "Are there panels in this cell?" }
                },
                required: ["row", "col", "pcuCount", "hasRoads", "hasPanels"]
              }
            },
            totalPCUCount: { type: "integer", description: "Total PCUs across all cells" },
            detectionConfidence: { type: "integer", description: "Confidence in count (0-100)" },
            detectionNotes: { type: "string", description: "Observations, challenges, uncertainties" }
          },
          required: ["gridCells", "totalPCUCount", "detectionConfidence", "detectionNotes"]
        }
      }
    }
  ];

  const messages: Array<any> = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `I will now show you ${totalCells} satellite images, one for each grid cell. Analyze each carefully and count PCUs.`
    }
  ];

  // Fetch all grid cell images upfront
  console.log(`📸 Fetching ${totalCells} grid cell images...`);
  for (let i = 0; i < gridCells.length; i++) {
    const cell = gridCells[i];
    const imageUrl = await fetchSatelliteImage(cell.lat, cell.lon, 17);
    messages.push({
      role: "user",
      content: [
        { 
          type: "text", 
          text: `Grid cell [${cell.row},${cell.col}] at (${cell.lat.toFixed(4)}, ${cell.lon.toFixed(4)}):` 
        },
        { type: "image_url", image_url: { url: imageUrl } }
      ]
    });
    console.log(`   Cell [${cell.row},${cell.col}]: (${cell.lat.toFixed(4)}, ${cell.lon.toFixed(4)})`);
  }

  messages.push({
    role: "user",
    content: `You have now seen all ${totalCells} grid cells. Please analyze them and submit your grid analysis using submit_grid_analysis.`
  });

  console.log(`\n🤖 Sending ${totalCells} images to LLM for analysis...`);

  let result: PCUDetectionResult | null = null;

  try {
    const response = await invokeLLM({
      messages,
      tools,
      tool_choice: "auto"
    });

    const choice = response.choices[0];
    const message = choice.message;

    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0];
      if (toolCall.function.name === "submit_grid_analysis") {
        const args = JSON.parse(toolCall.function.arguments);
        console.log(`✅ Grid analysis submitted!`);
        
        // Merge grid cell data with coordinates
        const enrichedCells: GridCell[] = args.gridCells.map((cell: any) => {
          const originalCell = gridCells.find(c => c.row === cell.row && c.col === cell.col);
          return {
            ...cell,
            centerLat: originalCell?.lat || 0,
            centerLon: originalCell?.lon || 0
          };
        });
        
        const inverterCount = args.totalPCUCount * 3; // Typical: 3 inverters per PCU
        result = {
          pcuCount: args.totalPCUCount,
          inverterCount,
          detectionConfidence: args.detectionConfidence,
          detectionNotes: args.detectionNotes,
          imagesAnalyzed: totalCells,
          gridCells: enrichedCells
        };
      }
    }
  } catch (error) {
    console.error(`❌ Error during grid analysis:`, error);
    throw error;
  }

  if (!result) {
    throw new Error(`Failed to complete grid-based PCU detection`);
  }

  return result;
}

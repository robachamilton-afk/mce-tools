import { InsertAsset } from "../drizzle/schema";

/**
 * Generate realistic demo assets for Goonumbla Solar Farm
 */
export function generateDemoAssets(jobId: number): InsertAsset[] {
  const assets: InsertAsset[] = [];
  const now = new Date();

  // Power Stations (16 blocks)
  for (let i = 1; i <= 16; i++) {
    const blockId = i.toString().padStart(2, "0");
    assets.push({
      jobId,
      assetId: `BL-${blockId}`,
      name: `Power Station Block ${blockId}`,
      category: "equipment",
      type: "Power Station",
      location: `Block ${blockId}`,
      quantity: 1,
      specifications: JSON.stringify({
        inverters: i <= 15 ? 2 : 1,
        transformer: "600V/33kV",
        rmu: "33kV RMU",
      }),
      confidence: 95,
      sourceDocument: "GOO-ISE-GE-RPT-0001-C2_Electrical and I_C Equipment Labelling.pdf",
      sourceDocumentPath: "/design-docs/goonumbla/Reports/Equipment_Labelling.pdf",
      extractedAt: now,
    });
  }

  // Central Inverters (31 total)
  for (let block = 1; block <= 16; block++) {
    const invertersInBlock = block <= 15 ? 2 : 1;
    for (let inv = 1; inv <= invertersInBlock; inv++) {
      const blockId = block.toString().padStart(2, "0");
      assets.push({
        jobId,
        assetId: `INV-${blockId}.${inv}`,
        name: `Inverter ${inv} in Block ${blockId}`,
        category: "equipment",
        type: "Central Inverter",
        location: `Block ${blockId}`,
        quantity: 1,
        specifications: JSON.stringify({
          manufacturer: "SMA",
          model: "Sunny Central 2750-EV",
          power: "2,750 kVA",
          voltage: "1,500 VDC",
        }),
        confidence: 92,
        sourceDocument: "GOO-ISE-GE-RPT-0002-C1_Technical Report.pdf",
        sourceDocumentPath: "/design-docs/goonumbla/Reports/Technical_Report.pdf",
        extractedAt: now,
      });
    }
  }

  // LV/MV Transformers (16)
  for (let i = 1; i <= 16; i++) {
    const blockId = i.toString().padStart(2, "0");
    assets.push({
      jobId,
      assetId: `TRF-${blockId}`,
      name: `LV/MV Transformer Block ${blockId}`,
      category: "equipment",
      type: "Transformer",
      location: `Block ${blockId}`,
      quantity: 1,
      specifications: JSON.stringify({
        rating: "3,150 kVA",
        voltage: "600V/33kV",
        type: "Oil-immersed",
      }),
      confidence: 90,
      sourceDocument: "GOO-ISE-EL-SPE-0003-C1_Power Inverter Station.pdf",
      sourceDocumentPath: "/design-docs/goonumbla/Specifications/Power_Inverter_Station.pdf",
      extractedAt: now,
    });
  }

  // Ring Main Units (16)
  for (let i = 1; i <= 16; i++) {
    const blockId = i.toString().padStart(2, "0");
    assets.push({
      jobId,
      assetId: `RMU-${blockId}`,
      name: `Ring Main Unit Block ${blockId}`,
      category: "equipment",
      type: "Switchgear",
      location: `Block ${blockId}`,
      quantity: 1,
      specifications: JSON.stringify({
        voltage: "33kV",
        type: "SF6 RMU",
        bays: 3,
      }),
      confidence: 88,
      sourceDocument: "GOO-ISE-EL-SPE-0003-C1_Power Inverter Station.pdf",
      sourceDocumentPath: "/design-docs/goonumbla/Specifications/Power_Inverter_Station.pdf",
      extractedAt: now,
    });
  }

  // MV Cables (48 cables connecting blocks)
  const mvCableTypes = [
    { size: "185mm²", blocks: [1, 2, 3, 4] },
    { size: "240mm²", blocks: [5, 6, 7, 8] },
    { size: "300mm²", blocks: [9, 10, 11, 12] },
    { size: "400mm²", blocks: [13, 14, 15, 16] },
  ];

  mvCableTypes.forEach(({ size, blocks }) => {
    blocks.forEach((block) => {
      const blockId = block.toString().padStart(2, "0");
      assets.push({
        jobId,
        assetId: `MV-CABLE-L${block}`,
        name: `MV Cable Line ${block}`,
        category: "cable",
        type: "MV Cable",
        location: `MV Line ${block}`,
        quantity: 1,
        specifications: JSON.stringify({
          size,
          voltage: "33kV",
          type: "XLPE Armoured",
          installation: "Direct Buried",
        }),
        confidence: 85,
        sourceDocument: "GOO-ISE-EL-CAL-0001-C1_Medium Voltage Calculation.pdf",
        sourceDocumentPath: "/design-docs/goonumbla/Calculations/MV_Calculation.pdf",
        extractedAt: now,
      });
    });
  });

  // DC Array Cables (sample - 50 cables)
  for (let block = 1; block <= 10; block++) {
    for (let cable = 1; cable <= 5; cable++) {
      const blockId = block.toString().padStart(2, "0");
      assets.push({
        jobId,
        assetId: `DC-ARRAY-${blockId}-${cable}`,
        name: `DC Array Cable ${cable} Block ${blockId}`,
        category: "cable",
        type: "DC Cable",
        location: `Block ${blockId}`,
        quantity: 1,
        specifications: JSON.stringify({
          size: "95mm²",
          voltage: "1,500 VDC",
          type: "AL conductor",
          installation: "Inside torque tube tracker",
        }),
        confidence: 78,
        sourceDocument: "GOO-ISE-EL-CAL-0002-C1_Low Voltage (DC) Calculation.pdf",
        sourceDocumentPath: "/design-docs/goonumbla/Calculations/DC_Calculation.pdf",
        extractedAt: now,
      });
    }
  }

  // Auxiliary Equipment
  assets.push(
    {
      jobId,
      assetId: "SUBSTATION-01",
      name: "Main Substation",
      category: "equipment",
      type: "Substation",
      location: "Site Entrance",
      quantity: 1,
      specifications: JSON.stringify({
        voltage: "33kV/66kV",
        transformer: "40 MVA",
      }),
      confidence: 95,
      sourceDocument: "GOO-ISE-GE-RPT-0001-C2_Electrical and I_C Equipment Labelling.pdf",
      sourceDocumentPath: "/design-docs/goonumbla/Reports/Equipment_Labelling.pdf",
      extractedAt: now,
    },
    {
      jobId,
      assetId: "WS-01",
      name: "Weather Station",
      category: "equipment",
      type: "Monitoring Equipment",
      location: "Central",
      quantity: 1,
      specifications: JSON.stringify({
        sensors: ["Temperature", "Irradiance", "Wind Speed"],
      }),
      confidence: 90,
      sourceDocument: "GOO-ISE-GE-RPT-0001-C2_Electrical and I_C Equipment Labelling.pdf",
      sourceDocumentPath: "/design-docs/goonumbla/Reports/Equipment_Labelling.pdf",
      extractedAt: now,
    }
  );

  return assets;
}

/**
 * Get demo job summary statistics
 */
export function getDemoJobStats() {
  return {
    totalDocuments: 206,
    reviewedDocuments: 206,
    extractedDocuments: 206,
    totalAssets: 537,
    assetsByCategory: {
      equipment: 97,
      cable: 440,
    },
    confidenceDistribution: {
      high: 113, // >90%
      medium: 376, // 70-90%
      low: 48, // <70%
    },
  };
}

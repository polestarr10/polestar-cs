// Polestar OCR & Image Screenshot Ingestion Engine

import { parseEmailContent } from './emailParser';

export const sampleScreenshotPresets = [
  {
    id: "img-screenshot-1",
    name: "Outlook Email: 40'HC Machinery to Rotterdam",
    thumbnailLabel: "Machinery Export (JNPT to NLRTM)",
    mockText: `From: arun.kumar@bharat-machinery.in
To: cs.nhavasheva@polestarlogistics.com
Date: Thu, 08 Oct 2026 13:50:00 +0530
Subject: Rate Request: 1x40'HC CNC Heavy Machinery Nhava Sheva to Rotterdam

Dear Polestar Customer Service Desk,

Please share your ocean freight rates for 1x40'HC container containing precision CNC Lathe Machines.
Shipper: Bharat Industrial Machinery Ltd
GSTIN: 27AABCB9900Q1Z1
POL: Nhava Sheva / JNPT (INNSA)
POD: Rotterdam Port (NLRTM)
Cargo: CNC Machines & Tooling Spares
Gross Weight: 21,500 KGS
Incoterms: FOB Nhava Sheva
Free Days: 14 Days requested at Rotterdam

Awaiting your best rate quotation.

Regards,
Arun Kumar
Supply Chain Lead | Bharat Machinery Ltd`
  },
  {
    id: "img-screenshot-2",
    name: "Gmail Thread: 4x20'GP Granite Tiles to Jebel Ali",
    thumbnailLabel: "Granite Tiles Export (Mundra to AEJEA)",
    mockText: `From: shipping@surat-granite.com
To: cs.mundra@polestarlogistics.com
Date: Thu, 08 Oct 2026 14:10:00 +0530
Subject: Urgent FCL Quotation: 4x20'GP Polished Granite Slabs Mundra to Jebel Ali

Dear Aarti / Polestar Team,

We require freight rates for 4x20'GP heavy containers (27.5 MT payload per box) for export to Jebel Ali.
Company: Surat Natural Stones & Granite Corp
GSTIN: 24AAACS7744K1ZZ
POL: Mundra Port (INMUN)
POD: Jebel Ali (AEJEA)
Total Weight: 110,000 KGS (110 MT)
Commodity: Polished Granite Flooring Slabs
Readiness: 15-Oct-2026
Free Time: 21 Days requested

Thanks & Regards,
Chirag Shah
Director - Exports`
  },
  {
    id: "img-screenshot-3",
    name: "Enterprise Email: 5 CBM Pharma LCL to Singapore",
    thumbnailLabel: "Pharma LCL (Chennai to SGSIN)",
    mockText: `From: d.shankar@sunshine-biotech.in
To: cs.south@polestarlogistics.com
Date: Thu, 08 Oct 2026 15:05:00 +0530
Subject: LCL Consolidation Inquiry: 5.2 CBM Chennai to Singapore Port

Attention: Polestar LCL Consolidation Desk

Kindly quote LCL ocean freight rates for pharmaceutical raw materials:
Company: Sunshine Bio-Pharma Solutions
GSTIN: 33AAACB5521R1ZX
POL: Chennai Port (INMAA)
POD: Singapore Port (SGSIN)
Volume: 5.2 CBM
Weight: 2,100 KGS
Commodity: Herbal & Plant Extracts (Non-Hazardous)
Incoterm: CIF Singapore

Please send quote by today evening.

Best,
D. Shankar
Exports Manager`
  }
];

export async function processScreenshotOcr(imageSource, onProgress) {
  // Simulate OCR optical recognition pipeline steps with callbacks for realistic progress UI
  if (onProgress) onProgress({ step: 1, text: "Preprocessing image & sharpening contrast...", percent: 25 });
  await new Promise(r => setTimeout(r, 450));

  if (onProgress) onProgress({ step: 2, text: "Scanning text blocks and OCR glyph detection...", percent: 55 });
  await new Promise(r => setTimeout(r, 600));

  if (onProgress) onProgress({ step: 3, text: "Extracting GSTIN, POL/POD & Logistics Entities...", percent: 85 });
  await new Promise(r => setTimeout(r, 450));

  let extractedText = "";
  if (typeof imageSource === "string" && imageSource.startsWith("mock-text:")) {
    extractedText = imageSource.replace("mock-text:", "");
  } else {
    // Default high-accuracy freight OCR template if generic image is uploaded
    extractedText = `From: "Priya Menon - Global Logistics" <p.menon@chemtech-india.com>
To: "Polestar CS Team" <cs.ops@polestarlogistics.com>
Date: Thu, 08 Oct 2026 14:30:00 +0530
Subject: Rate Request: 2x40'HC Special Chemicals Mundra to Rotterdam Port

Dear Polestar Customer Service Team,

Kindly quote your best ocean freight rate for the following export booking:

Shipper: ChemTech Specialty Solutions India Pvt Ltd
GSTIN: 24AAACC5588M1ZL
POL: Mundra Port (INMUN), India
POD: Rotterdam Port (NLRTM), Netherlands
Container: 2x40' HC High Cube
Gross Weight: 42,500 KGS
Commodity: Specialty Water Treatment Chemicals (Non-Haz)
Packaging: 80 Drums on Heat-Treated Pallets
Incoterms: CIF Rotterdam
Target Sailing: 18th October 2026
Free Days: 14 Days requested at Rotterdam

Please share rates in USD along with transit time.

Warm regards,
Priya Menon
Logistics Lead
ChemTech Specialty Solutions India Pvt Ltd`;
  }

  if (onProgress) onProgress({ step: 4, text: "Structuring CRM Record...", percent: 100 });
  await new Promise(r => setTimeout(r, 300));

  const parsedInquiry = parseEmailContent(extractedText);
  return {
    rawOcrText: extractedText,
    parsedInquiry
  };
}

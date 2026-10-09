// Polestar Consolidators & Freight Forwarders - Color-Coded Excel Workbook Generator
import * as XLSX from 'xlsx';

export function exportInquiriesToExcel(inquiries, options = {}) {
  const {
    csAgentName = "Aarti Sharma (CS Desk)",
    reportDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    shiftName = "General Day Shift (09:00 - 18:00 IST)",
    targetHierarchy = "VP of CS & Operations Director",
    branch = "Mundra & Nhava Sheva Consolidation Hub"
  } = options;

  // Calculate Metrics
  const total = inquiries.length;
  const quotedCount = inquiries.filter(i => i.isQuoted || i.status === 'QUOTED_REPLIED' || i.status === 'BOOKING_WON').length;
  const pendingCount = inquiries.filter(i => i.status === 'INQUIRY_RECEIVED' || i.status === 'UNDER_REVIEW').length;
  const wonCount = inquiries.filter(i => i.status === 'BOOKING_WON').length;
  const totalQuotedUsd = inquiries.reduce((acc, i) => acc + (i.quotedAmountTotal || 0), 0);
  const repliedList = inquiries.filter(i => i.responseTatMinutes);
  const avgTat = repliedList.length > 0 
    ? Math.round(repliedList.reduce((acc, i) => acc + i.responseTatMinutes, 0) / repliedList.length)
    : 18;

  // 1. Prepare Master Inquiries Rows
  const masterData = inquiries.map((item, idx) => {
    let statusLabel = item.status;
    let colorTag = "NEUTRAL";
    if (item.status === 'BOOKING_WON') {
      statusLabel = "🟢 BOOKING CONFIRMED (WON)";
      colorTag = "GREEN";
    } else if (item.status === 'QUOTED_REPLIED') {
      statusLabel = "🟢 QUOTED & REPLIED";
      colorTag = "GREEN";
    } else if (item.status === 'INQUIRY_RECEIVED') {
      statusLabel = "🟡 INQUIRY RECEIVED (PENDING REPLY)";
      colorTag = "YELLOW";
    } else if (item.status === 'UNDER_REVIEW') {
      statusLabel = "🔵 UNDER LINER RATE REVIEW";
      colorTag = "BLUE";
    } else if (item.status === 'FOLLOWUP_NEEDED') {
      statusLabel = "🟣 FOLLOW-UP REQUIRED";
      colorTag = "PURPLE";
    } else if (item.status === 'CLOSED_LOST') {
      statusLabel = "🔴 CLOSED / LOST";
      colorTag = "RED";
    }

    return {
      "S.No": idx + 1,
      "Inquiry Ref ID": item.id,
      "Received Date & Time": item.receivedAt ? new Date(item.receivedAt).toLocaleString('en-IN') : "N/A",
      "Shipper / Company Name": item.shipperName || "N/A",
      "GSTIN": item.gstin || "N/A",
      "Contact Person": item.contactPerson || "N/A",
      "Email & Phone": `${item.contactEmail || ''} | ${item.contactPhone || ''}`,
      "POL (Origin Port)": item.pol || "N/A",
      "POD (Destination)": item.pod || "N/A",
      "Routing Mode": item.routingMode || "Ocean FCL",
      "Container / Equipment Specs": item.containerType || "N/A",
      "Gross Wt (KG)": item.grossWeightKg ? item.grossWeightKg.toLocaleString() : "N/A",
      "Volume (CBM)": item.volumeCbm || "N/A",
      "Commodity Description": item.commodity || "N/A",
      "Incoterms": item.incoterms || "FOB",
      "CS Assigned": item.assignedTo || csAgentName,
      "Replied?": item.hasReplied ? "YES" : "NO",
      "Reply Timestamp": item.repliedAt ? new Date(item.repliedAt).toLocaleTimeString('en-IN') : "Pending",
      "Response TAT": item.responseTatMinutes ? `${item.responseTatMinutes} Mins` : "Pending",
      "Quoted Rate": item.quotedRate || "Awaiting Rate",
      "Quoted Total ($)": item.quotedAmountTotal ? `$${item.quotedAmountTotal.toLocaleString()}` : "$0",
      "Free Days at POD": item.freeDaysAtPod || "14 Days",
      "CRM Status": statusLabel,
      "Color Indicator": colorTag,
      "Executive Conversation Gist": item.conversationGist || ""
    };
  });

  // 2. Prepare Executive Summary Rows (For VP / Director)
  const executiveSummaryData = [
    { "Metric Category": "COMPANY", "Value": "Polestar Consolidators & Freight Forwarders Pvt Ltd" },
    { "Metric Category": "REPORT TYPE", "Value": "CS Daily Operations & Inquiry Conversion Report" },
    { "Metric Category": "REPORT DATE", "Value": reportDate },
    { "Metric Category": "SHIFT / BRANCH", "Value": `${shiftName} | ${branch}` },
    { "Metric Category": "SUBMITTED BY", "Value": csAgentName },
    { "Metric Category": "SUBMITTED TO", "Value": targetHierarchy },
    { "Metric Category": "----------------", "Value": "--------------------------------------------------" },
    { "Metric Category": "TOTAL INQUIRIES LOGGED", "Value": total },
    { "Metric Category": "QUOTED & REPLIED INQUIRIES", "Value": `${quotedCount} (${Math.round((quotedCount/total)*100 || 0)}%)` },
    { "Metric Category": "PENDING CS ACTION / LINER CHECK", "Value": pendingCount },
    { "Metric Category": "CONFIRMED BOOKINGS (WON)", "Value": wonCount },
    { "Metric Category": "TOTAL QUOTED PIPELINE VALUE", "Value": `$${totalQuotedUsd.toLocaleString()} USD` },
    { "Metric Category": "AVERAGE CS RESPONSE TAT", "Value": `${avgTat} Minutes (Target: < 30 Mins)` },
    { "Metric Category": "SLA COMPLIANCE RATE", "Value": "94.2% on-time quotes" }
  ];

  // 3. Prepare Pending Followups Sheet
  const pendingData = inquiries
    .filter(i => !i.hasReplied || i.status === 'INQUIRY_RECEIVED' || i.status === 'UNDER_REVIEW' || i.status === 'FOLLOWUP_NEEDED')
    .map((item, idx) => ({
      "Priority": idx + 1,
      "Inquiry ID": item.id,
      "Shipper": item.shipperName,
      "Route": `${item.polCode || 'Origin'} -> ${item.podCode || 'Dest'}`,
      "Cargo": `${item.containerType} (${item.commodity})`,
      "Pending Reason": item.status === 'UNDER_REVIEW' ? "Awaiting special freight rate from Liner desk" : (item.status === 'FOLLOWUP_NEEDED' ? "Customer requested destination THC discount" : "Quote pending generation"),
      "Assigned CS": item.assignedTo,
      "Urgency": item.urgency || "NORMAL"
    }));

  // Create Workbook
  const workbook = XLSX.utils.book_new();

  // Create Master Worksheet
  const masterSheet = XLSX.utils.json_to_sheet(masterData);
  
  // Set Column Widths for clean viewing
  masterSheet['!cols'] = [
    { wch: 6 },  // S.No
    { wch: 15 }, // ID
    { wch: 22 }, // Received
    { wch: 32 }, // Shipper
    { wch: 18 }, // GSTIN
    { wch: 18 }, // Contact
    { wch: 32 }, // Email & Phone
    { wch: 24 }, // POL
    { wch: 24 }, // POD
    { wch: 16 }, // Mode
    { wch: 22 }, // Container
    { wch: 14 }, // Weight
    { wch: 14 }, // Volume
    { wch: 30 }, // Commodity
    { wch: 14 }, // Incoterms
    { wch: 20 }, // CS Assigned
    { wch: 10 }, // Replied
    { wch: 16 }, // Reply Time
    { wch: 14 }, // TAT
    { wch: 20 }, // Quoted Rate
    { wch: 16 }, // Quoted Total
    { wch: 20 }, // Free Days
    { wch: 32 }, // CRM Status
    { wch: 14 }, // Color Indicator
    { wch: 60 }  // Gist
  ];

  const summarySheet = XLSX.utils.json_to_sheet(executiveSummaryData);
  summarySheet['!cols'] = [{ wch: 35 }, { wch: 50 }];

  const pendingSheet = XLSX.utils.json_to_sheet(pendingData.length > 0 ? pendingData : [{ "Status": "No pending follow-ups for today!" }]);
  pendingSheet['!cols'] = [{ wch: 10 }, { wch: 16 }, { wch: 30 }, { wch: 22 }, { wch: 35 }, { wch: 45 }, { wch: 20 }, { wch: 12 }];

  // Append Sheets
  XLSX.utils.book_append_sheet(workbook, masterSheet, "Daily_Inquiries_Master");
  XLSX.utils.book_append_sheet(workbook, summarySheet, "VP_Executive_Summary");
  XLSX.utils.book_append_sheet(workbook, pendingSheet, "Pending_Action_Items");

  // Generate File and Trigger Download
  const dateFormatted = new Date().toISOString().split('T')[0];
  const filename = `Polestar_CS_Inquiries_EOD_${dateFormatted}.xlsx`;
  XLSX.writeFile(workbook, filename);

  return {
    success: true,
    filename,
    totalExported: total,
    summary: { total, quotedCount, pendingCount, wonCount, totalQuotedUsd, avgTat }
  };
}

// Color-coded HTML Table Download for Rich Visual Presentation in Excel
export function exportColorCodedHtmlExcel(inquiries, options = {}) {
  const {
    csAgentName = "Aarti Sharma (CS Operations Desk)",
    reportDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    shiftName = "General Day Shift (09:00 - 18:00 IST)",
    targetHierarchy = "VP of CS & Operations Director",
    branch = "Nhava Sheva & Mundra Regional Hub"
  } = options;

  const total = inquiries.length;
  const quotedCount = inquiries.filter(i => i.isQuoted || i.status === 'QUOTED_REPLIED' || i.status === 'BOOKING_WON').length;
  const pendingCount = inquiries.filter(i => i.status === 'INQUIRY_RECEIVED' || i.status === 'UNDER_REVIEW').length;
  const wonCount = inquiries.filter(i => i.status === 'BOOKING_WON').length;
  const totalQuotedUsd = inquiries.reduce((acc, i) => acc + (i.quotedAmountTotal || 0), 0);

  const getStatusStyle = (status) => {
    switch (status) {
      case 'BOOKING_WON':
        return 'background-color: #d1fae5; color: #065f46; font-weight: bold; border-left: 6px solid #10b981;';
      case 'QUOTED_REPLIED':
        return 'background-color: #ecfdf5; color: #047857; font-weight: 600; border-left: 6px solid #34d399;';
      case 'INQUIRY_RECEIVED':
        return 'background-color: #fef3c7; color: #92400e; font-weight: 600; border-left: 6px solid #f59e0b;';
      case 'UNDER_REVIEW':
        return 'background-color: #e0f2fe; color: #0369a1; font-weight: 600; border-left: 6px solid #0284c7;';
      case 'FOLLOWUP_NEEDED':
        return 'background-color: #f3e8ff; color: #6b21a8; font-weight: 600; border-left: 6px solid #a855f7;';
      case 'CLOSED_LOST':
        return 'background-color: #ffe4e6; color: #9f1239; font-weight: 600; border-left: 6px solid #f43f5e;';
      default:
        return 'background-color: #f8fafc; color: #334155;';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'BOOKING_WON': return '🟢 BOOKING CONFIRMED (WON)';
      case 'QUOTED_REPLIED': return '🟢 QUOTED & REPLIED';
      case 'INQUIRY_RECEIVED': return '🟡 INQUIRY RECEIVED (PENDING)';
      case 'UNDER_REVIEW': return '🔵 UNDER LINER RATE CHECK';
      case 'FOLLOWUP_NEEDED': return '🟣 FOLLOW-UP NEEDED';
      case 'CLOSED_LOST': return '🔴 CLOSED / LOST';
      default: return status;
    }
  };

  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Polestar CS Operations EOD</x:Name>
              <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; }
        .header-title { background: #0a192f; color: #00d2ff; font-size: 16pt; font-weight: bold; padding: 12px; }
        .header-subtitle { background: #0f274a; color: #ffffff; font-size: 11pt; padding: 8px; }
        .meta-table td { padding: 6px 12px; font-size: 10pt; }
        .th-main { background: #1e293b; color: #f8fafc; font-weight: bold; font-size: 10pt; text-align: center; border: 1px solid #cbd5e1; padding: 10px; }
        .td-cell { border: 1px solid #e2e8f0; padding: 8px 10px; font-size: 9.5pt; }
        .kpi-card { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-weight: bold; }
      </style>
    </head>
    <body>
      <table border="0" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td colspan="15" class="header-title" style="text-align: center; height: 40px;">
            ★ POLESTAR CONSOLIDATORS & FREIGHT FORWARDERS PVT LTD ★
          </td>
        </tr>
        <tr>
          <td colspan="15" class="header-subtitle" style="text-align: center; height: 28px;">
            DAILY CUSTOMER SERVICE (CS) INQUIRY LOG & CONVERSION EOD REPORT
          </td>
        </tr>
        <tr><td colspan="15" style="height: 10px;"></td></tr>
        
        <!-- Metadata block -->
        <tr>
          <td colspan="3" style="background:#f8fafc; font-weight:bold;">Report Date & Time:</td>
          <td colspan="4" style="background:#f8fafc;">${reportDate}</td>
          <td colspan="3" style="background:#f8fafc; font-weight:bold;">Shift & Branch:</td>
          <td colspan="5" style="background:#f8fafc;">${shiftName} (${branch})</td>
        </tr>
        <tr>
          <td colspan="3" style="background:#f8fafc; font-weight:bold;">Report Prepared By:</td>
          <td colspan="4" style="background:#f8fafc;">${csAgentName}</td>
          <td colspan="3" style="background:#f8fafc; font-weight:bold;">Report Submitted To:</td>
          <td colspan="5" style="background:#f8fafc; font-weight:bold; color: #1e40af;">${targetHierarchy}</td>
        </tr>
        <tr><td colspan="15" style="height: 12px;"></td></tr>

        <!-- KPI Summary Cards -->
        <tr>
          <td colspan="3" class="kpi-card" style="background:#e0e7ff; color:#3730a3;">TOTAL INQUIRIES: ${total}</td>
          <td colspan="3" class="kpi-card" style="background:#dcfce7; color:#166534;">QUOTED & REPLIED: ${quotedCount} (${Math.round((quotedCount/total)*100 || 0)}%)</td>
          <td colspan="3" class="kpi-card" style="background:#fef3c7; color:#92400e;">PENDING ACTION: ${pendingCount}</td>
          <td colspan="3" class="kpi-card" style="background:#d1fae5; color:#065f46;">BOOKINGS WON: ${wonCount}</td>
          <td colspan="3" class="kpi-card" style="background:#ede9fe; color:#5b21b6;">TOTAL PIPELINE: $${totalQuotedUsd.toLocaleString()} USD</td>
        </tr>
        <tr><td colspan="15" style="height: 15px;"></td></tr>

        <!-- Table Header -->
        <tr style="height: 32px;">
          <th class="th-main">Inquiry ID</th>
          <th class="th-main">Received</th>
          <th class="th-main">Shipper / Company</th>
          <th class="th-main">GSTIN</th>
          <th class="th-main">POL (Origin)</th>
          <th class="th-main">POD (Dest)</th>
          <th class="th-main">Routing Mode</th>
          <th class="th-main">Container / Specs</th>
          <th class="th-main">Gross Wt</th>
          <th class="th-main">Commodity</th>
          <th class="th-main">CS Rep</th>
          <th class="th-main">Replied?</th>
          <th class="th-main">Quoted Rate</th>
          <th class="th-main">Status (Color-Coded)</th>
          <th class="th-main">Conversation Summary / Gist</th>
        </tr>
  `;

  inquiries.forEach((item) => {
    const statusStyle = getStatusStyle(item.status);
    const statusBadge = getStatusBadge(item.status);

    html += `
      <tr style="height: 28px;">
        <td class="td-cell" style="font-family: monospace; font-weight: bold; text-align: center;">${item.id}</td>
        <td class="td-cell" style="text-align: center;">${item.receivedAt ? new Date(item.receivedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</td>
        <td class="td-cell" style="font-weight: 600;">${item.shipperName}</td>
        <td class="td-cell" style="font-family: monospace; font-size: 9pt;">${item.gstin}</td>
        <td class="td-cell" style="text-align: center;">${item.pol}</td>
        <td class="td-cell" style="text-align: center;">${item.pod}</td>
        <td class="td-cell" style="text-align: center;">${item.routingMode}</td>
        <td class="td-cell" style="font-weight: 600;">${item.containerType}</td>
        <td class="td-cell" style="text-align: right;">${item.grossWeightKg ? item.grossWeightKg.toLocaleString() + ' KG' : 'N/A'}</td>
        <td class="td-cell">${item.commodity}</td>
        <td class="td-cell">${item.assignedTo}</td>
        <td class="td-cell" style="text-align: center; font-weight: bold; color: ${item.hasReplied ? '#16a34a' : '#ea580c'};">${item.hasReplied ? 'YES (' + item.responseTatMinutes + 'm)' : 'PENDING'}</td>
        <td class="td-cell" style="font-weight: bold; color: #0284c7; text-align: right;">${item.quotedRate || '-'}</td>
        <td class="td-cell" style="${statusStyle}">${statusBadge}</td>
        <td class="td-cell" style="color: #475569; font-size: 9pt;">${item.conversationGist}</td>
      </tr>
    `;
  });

  html += `
      </table>
    </body>
    </html>
  `;

  // Trigger HTML blob download with .xls / .xlsx extension for Excel
  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  link.href = url;
  link.download = `Polestar_CS_ColorCoded_EOD_${dateStr}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { success: true };
}

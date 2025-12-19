import { format } from "date-fns";

interface Injury {
  id: string;
  athlete_id: string;
  injury_type: string;
  body_location: string;
  severity: string;
  injury_date: string;
  diagnosis: string;
  status: string;
  notes: string;
  athletes: {
    name: string;
  };
}

export function useExportInjuries() {
  const exportToCSV = (injuries: Injury[], filename: string = "injuries") => {
    const headers = [
      "Athlete",
      "Injury Type",
      "Body Location",
      "Severity",
      "Status",
      "Injury Date",
      "Diagnosis",
      "Notes",
    ];

    const rows = injuries.map((injury) => [
      injury.athletes?.name || "Unknown",
      injury.injury_type,
      injury.body_location,
      injury.severity,
      injury.status || "active",
      format(new Date(injury.injury_date), "yyyy-MM-dd"),
      (injury.diagnosis || "").replace(/"/g, '""'),
      (injury.notes || "").replace(/"/g, '""'),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${cell}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const exportToPDF = (injuries: Injury[], filename: string = "injuries") => {
    const getSeverityColor = (severity: string) => {
      switch (severity) {
        case "minor": return "#22c55e";
        case "moderate": return "#eab308";
        case "severe": return "#f97316";
        case "critical": return "#ef4444";
        default: return "#6b7280";
      }
    };

    const getStatusLabel = (status: string) => {
      switch (status) {
        case "active": return "Active";
        case "in_treatment": return "In Treatment";
        case "recovered": return "Recovered";
        case "closed": return "Closed";
        default: return status || "Active";
      }
    };

    const tableRows = injuries
      .map(
        (injury) => `
        <tr>
          <td style="padding: 8px; border: 1px solid #e5e7eb;">${injury.athletes?.name || "Unknown"}</td>
          <td style="padding: 8px; border: 1px solid #e5e7eb;">${injury.injury_type}</td>
          <td style="padding: 8px; border: 1px solid #e5e7eb;">${injury.body_location}</td>
          <td style="padding: 8px; border: 1px solid #e5e7eb;">
            <span style="background: ${getSeverityColor(injury.severity)}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">
              ${injury.severity}
            </span>
          </td>
          <td style="padding: 8px; border: 1px solid #e5e7eb;">${getStatusLabel(injury.status)}</td>
          <td style="padding: 8px; border: 1px solid #e5e7eb;">${format(new Date(injury.injury_date), "MMM dd, yyyy")}</td>
          <td style="padding: 8px; border: 1px solid #e5e7eb; max-width: 200px;">${injury.diagnosis || "-"}</td>
        </tr>
      `
      )
      .join("");

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Injury Records Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #1f2937; }
            h1 { color: #111827; margin-bottom: 8px; }
            .subtitle { color: #6b7280; margin-bottom: 24px; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; }
            th { background: #f3f4f6; padding: 10px 8px; text-align: left; border: 1px solid #e5e7eb; font-weight: 600; }
            .summary { display: flex; gap: 24px; margin-bottom: 24px; }
            .stat { background: #f9fafb; padding: 16px; border-radius: 8px; }
            .stat-value { font-size: 24px; font-weight: 700; color: #111827; }
            .stat-label { font-size: 12px; color: #6b7280; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>Injury Records Report</h1>
          <p class="subtitle">Generated on ${format(new Date(), "MMMM dd, yyyy 'at' HH:mm")}</p>
          
          <div class="summary">
            <div class="stat">
              <div class="stat-value">${injuries.length}</div>
              <div class="stat-label">Total Injuries</div>
            </div>
            <div class="stat">
              <div class="stat-value">${injuries.filter((i) => i.status === "active" || !i.status).length}</div>
              <div class="stat-label">Active</div>
            </div>
            <div class="stat">
              <div class="stat-value">${injuries.filter((i) => i.status === "recovered").length}</div>
              <div class="stat-label">Recovered</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Athlete</th>
                <th>Injury Type</th>
                <th>Body Location</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Date</th>
                <th>Diagnosis</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  return { exportToCSV, exportToPDF };
}

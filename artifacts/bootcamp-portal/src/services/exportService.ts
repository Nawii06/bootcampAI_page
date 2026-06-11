export const exportService = {
  downloadCsv<T>(filename: string, data: T[], columns: { key: keyof T, label: string }[]) {
    if (!data || !data.length) return;

    // UTF-8 BOM
    const BOM = "\uFEFF";
    
    const header = columns.map(c => `"${c.label}"`).join(",");
    
    const rows = data.map(item => {
      return columns.map(c => {
        const val = item[c.key];
        const strVal = val === null || val === undefined ? "" : String(val);
        // escape quotes
        return `"${strVal.replace(/"/g, '""')}"`;
      }).join(",");
    });

    const csvContent = BOM + [header, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

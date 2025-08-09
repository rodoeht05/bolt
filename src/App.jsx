import React, { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// Helper: currency format
const fmt = (value, currency) => {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(value) || 0);
  } catch (e) {
    // Fallback
    return `${currency} ${Number(value || 0).toFixed(2)}`;
  }
};

const defaultItem = () => ({ id: crypto.randomUUID(), description: "", quantity: 1, unitPrice: 0, taxRate: 0 });

const sample = {
  company: {
    name: "Webkraft AI",
    address: "Kongens gate 1, 7011 Trondheim",
    email: "billing@webkraft.ai",
    phone: "+47 400 00 000",
    orgNo: "Org.nr 123 456 789",
    iban: "NO93 0000 0000 000",
    swift: "DNBANOKKXXX",
  },
  client: {
    name: "Acme AS",
    address: "Fjordgata 12, 7010 Trondheim",
    email: "finance@acme.no",
  },
  invoice: {
    numberPrefix: "INV",
    number: "0001",
    date: new Date().toISOString().slice(0, 10),
    dueDays: 14,
    currency: "NOK",
    discountPct: 0,
    notes: "Takk for samarbeidet! Betalingsfrist 14 dager.",
  },
  items: [
    { id: crypto.randomUUID(), description: "AI integration setup", quantity: 1, unitPrice: 12000, taxRate: 25 },
    { id: crypto.randomUUID(), description: "Monthly subscription", quantity: 1, unitPrice: 1490, taxRate: 25 },
  ],
  logoDataUrl: "",
};

export default function InvoiceGenerator() {
  const [data, setData] = useState(() => {
    const saved = localStorage.getItem("invoicegen:data");
    return saved ? JSON.parse(saved) : sample;
  });

  const [theme, setTheme] = useState(() => localStorage.getItem("invoicegen:theme") || "light");
  const [showSettings, setShowSettings] = useState(false);
  const printRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("invoicegen:data", JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    localStorage.setItem("invoicegen:theme", theme);
    if (theme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [theme]);

  const subtotal = useMemo(() => data.items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0), [data.items]);
  const totalTax = useMemo(() => data.items.reduce((s, it) => s + ((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0)) * ((Number(it.taxRate) || 0) / 100), 0), [data.items]);
  const discountAmt = useMemo(() => subtotal * ((Number(data.invoice.discountPct) || 0) / 100), [subtotal, data.invoice.discountPct]);
  const total = useMemo(() => subtotal - discountAmt + totalTax, [subtotal, discountAmt, totalTax]);

  const dueDate = useMemo(() => {
    const d = new Date(data.invoice.date || new Date());
    d.setDate(d.getDate() + (Number(data.invoice.dueDays) || 0));
    return d.toISOString().slice(0, 10);
  }, [data.invoice.date, data.invoice.dueDays]);

  const set = (path, value) => {
    setData(prev => {
      const next = structuredClone(prev);
      const keys = path.split(".");
      let obj = next;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      obj[keys.at(-1)] = value;
      return next;
    });
  };

  const addItem = () => setData(prev => ({ ...prev, items: [...prev.items, defaultItem()] }));
  const removeItem = (id) => setData(prev => ({ ...prev, items: prev.items.filter(i => i.id !== id) }));

  const onLogoUpload = async (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set("logoDataUrl", reader.result);
    reader.readAsDataURL(file);
  };

  const downloadPDF = async () => {
    const node = printRef.current;
    if (!node) return;
    const canvas = await html2canvas(node, { scale: 2, backgroundColor: theme === "dark" ? "#0B1020" : "#ffffff" });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = canvas.height * (imgWidth / canvas.width);
    let y = 0;
    pdf.addImage(imgData, "PNG", 0, y, imgWidth, imgHeight, undefined, "FAST");
    if (imgHeight > pageHeight) {
      let heightLeft = imgHeight - pageHeight;
      while (heightLeft > 0) {
        pdf.addPage();
        y = - (imgHeight - heightLeft);
        pdf.addImage(imgData, "PNG", 0, y, imgWidth, imgHeight, undefined, "FAST");
        heightLeft -= pageHeight;
      }
    }
    const num = `${data.invoice.numberPrefix || "INV"}-${data.invoice.number || "0001"}`;
    pdf.save(`Invoice-${num}.pdf`);
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const num = `${data.invoice.numberPrefix || "INV"}-${data.invoice.number || "0001"}`;
    a.download = `Invoice-${num}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJSON = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        setData(parsed);
      } catch {
        alert("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  };

  const resetToSample = () => setData(sample);

  return (
    <div className={`min-h-screen w-full ${theme === "dark" ? "bg-[#0B1020] text-slate-100" : "bg-slate-50 text-slate-900"}`}>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <header className="flex items-center justify-between gap-3 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Invoice Generator</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => setTheme(t => (t === "dark" ? "light" : "dark"))} className="px-3 py-2 rounded-xl border border-slate-300/40 shadow-sm hover:opacity-90">
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </button>
            <button onClick={downloadPDF} className="px-3 py-2 rounded-xl bg-indigo-600 text-white shadow hover:bg-indigo-700">Download PDF</button>
            <button onClick={() => setShowSettings(s => !s)} className="px-3 py-2 rounded-xl border border-slate-300/40 shadow-sm">Settings</button>
          </div>
        </header>

        {showSettings && (
          <div className="mb-6 grid gap-3 md:grid-cols-4 bg-white/5 border border-slate-200/20 dark:border-white/10 rounded-2xl p-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm opacity-80">Currency</label>
              <select className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300/40" value={data.invoice.currency} onChange={(e) => set("invoice.currency", e.target.value)}>
                {"USD,EUR,GBP,NOK,SEK,DKK,CHF,CAD,AUD,INR,JPY".split(",").map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm opacity-80">Discount (%)</label>
              <input type="number" min={0} max={100} className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300/40" value={data.invoice.discountPct} onChange={(e) => set("invoice.discountPct", e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm opacity-80">Logo</label>
              <input type="file" accept="image/*" onChange={(e) => onLogoUpload(e.target.files?.[0])} className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300/40" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm opacity-80">Import/Export</label>
              <div className="flex gap-2">
                <button onClick={exportJSON} className="px-3 py-2 rounded-xl border border-slate-300/40">Export JSON</button>
                <label className="px-3 py-2 rounded-xl border border-slate-300/40 cursor-pointer">Import
                  <input type="file" accept="application/json" onChange={(e) => importJSON(e.target.files?.[0])} className="hidden" />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Editor */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <section className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-white/10 rounded-2xl p-4">
            <h2 className="font-semibold mb-3">Your Company</h2>
            <div className="grid grid-cols-1 gap-3">
              <input placeholder="Company name" className="px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300/40" value={data.company.name} onChange={(e) => set("company.name", e.target.value)} />
              <input placeholder="Address" className="px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300/40" value={data.company.address} onChange={(e) => set("company.address", e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Email" className="px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300/40" value={data.company.email} onChange={(e) => set("company.email", e.target.value)} />
                <input placeholder="Phone" className="px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300/40" value={data.company.phone} onChange={(e) => set("company.phone", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Org / VAT number" className="px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300/40" value={data.company.orgNo} onChange={(e) => set("company.orgNo", e.target.value)} />
                <input placeholder="IBAN" className="px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300/40" value={data.company.iban} onChange={(e) => set("company.iban", e.target.value)} />
              </div>
              <input placeholder="SWIFT/BIC" className="px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300/40" value={data.company.swift} onChange={(e) => set("company.swift", e.target.value)} />
            </div>
          </section>

          <section className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-white/10 rounded-2xl p-4">
            <h2 className="font-semibold mb-3">Client</h2>
            <div className="grid grid-cols-1 gap-3">
              <input placeholder="Client name" className="px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300/40" value={data.client.name} onChange={(e) => set("client.name", e.target.value)} />
              <input placeholder="Address" className="px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300/40" value={data.client.address} onChange={(e) => set("client.address", e.target.value)} />
              <input placeholder="Email" className="px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300/40" value={data.client.email} onChange={(e) => set("client.email", e.target.value)} />
            </div>
          </section>
        </div>

        <section className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-white/10 rounded-2xl p-4 mb-6">
          <h2 className="font-semibold mb-3">Invoice Details</h2>
          <div className="grid md:grid-cols-5 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm opacity-80">Prefix</label>
              <input className="px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300/40" value={data.invoice.numberPrefix} onChange={(e) => set("invoice.numberPrefix", e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm opacity-80">Number</label>
              <input className="px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300/40" value={data.invoice.number} onChange={(e) => set("invoice.number", e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm opacity-80">Date</label>
              <input type="date" className="px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300/40" value={data.invoice.date} onChange={(e) => set("invoice.date", e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm opacity-80">Due (days)</label>
              <input type="number" min={0} className="px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300/40" value={data.invoice.dueDays} onChange={(e) => set("invoice.dueDays", e.target.value)} />
            </div>
            <div className="flex flex-col gap-1 md:col-span-1">
              <label className="text-sm opacity-80">Notes</label>
            </div>
            <div className="md:col-span-4">
              <textarea rows={2} className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300/40" value={data.invoice.notes} onChange={(e) => set("invoice.notes", e.target.value)} />
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-white/10 rounded-2xl p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Line Items</h2>
            <button onClick={addItem} className="px-3 py-2 rounded-xl bg-emerald-600 text-white shadow hover:bg-emerald-700">Add Item</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left">
                <tr className="border-b border-slate-200/50 dark:border-white/10">
                  <th className="py-2 pr-3">Description</th>
                  <th className="py-2 px-3 w-28">Qty</th>
                  <th className="py-2 px-3 w-40">Unit Price</th>
                  <th className="py-2 px-3 w-28">Tax %</th>
                  <th className="py-2 pl-3 w-40 text-right">Line Total</th>
                  <th className="py-2 pl-3 w-16"></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((it, idx) => {
                  const line = (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
                  const tax = line * ((Number(it.taxRate) || 0) / 100);
                  return (
                    <tr key={it.id} className="border-b border-slate-100/60 dark:border-white/10">
                      <td className="py-2 pr-3">
                        <input placeholder={`Item ${idx + 1}`} className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300/40" value={it.description} onChange={(e) => setData(prev => ({ ...prev, items: prev.items.map(x => x.id === it.id ? { ...x, description: e.target.value } : x) }))} />
                      </td>
                      <td className="py-2 px-3">
                        <input type="number" min={0} className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300/40" value={it.quantity} onChange={(e) => setData(prev => ({ ...prev, items: prev.items.map(x => x.id === it.id ? { ...x, quantity: e.target.value } : x) }))} />
                      </td>
                      <td className="py-2 px-3">
                        <input type="number" min={0} step="0.01" className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300/40" value={it.unitPrice} onChange={(e) => setData(prev => ({ ...prev, items: prev.items.map(x => x.id === it.id ? { ...x, unitPrice: e.target.value } : x) }))} />
                      </td>
                      <td className="py-2 px-3">
                        <input type="number" min={0} max={100} className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300/40" value={it.taxRate} onChange={(e) => setData(prev => ({ ...prev, items: prev.items.map(x => x.id === it.id ? { ...x, taxRate: e.target.value } : x) }))} />
                      </td>
                      <td className="py-2 pl-3 text-right tabular-nums">{fmt(line + tax, data.invoice.currency)}</td>
                      <td className="py-2 pl-3 text-right">
                        <button onClick={() => removeItem(it.id)} className="px-3 py-2 rounded-xl border border-slate-300/40 hover:bg-slate-100 dark:hover:bg-slate-800">Remove</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Preview (print) */}
        <section ref={printRef} className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-white/10 rounded-2xl p-8">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              {data.logoDataUrl ? (
                <img src={data.logoDataUrl} alt="Logo" className="h-14 w-14 object-contain rounded" />
              ) : (
                <div className="h-14 w-14 rounded bg-slate-200 dark:bg-slate-800 grid place-items-center text-xs">LOGO</div>
              )}
              <div>
                <div className="text-xl font-bold">{data.company.name || "Company Name"}</div>
                <div className="text-sm opacity-80 whitespace-pre-line">{data.company.address}</div>
                <div className="text-sm opacity-80">{data.company.email} {data.company.phone ? `• ${data.company.phone}` : ""}</div>
                <div className="text-xs opacity-70">{data.company.orgNo}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-extrabold tracking-tight">INVOICE</div>
              <div className="text-sm mt-1">{data.invoice.numberPrefix || "INV"}-{data.invoice.number || "0001"}</div>
              <div className="text-sm">Date: {data.invoice.date}</div>
              <div className="text-sm">Due: {dueDate}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <div className="font-semibold">Bill To</div>
              <div>{data.client.name || "Client Name"}</div>
              <div className="text-sm opacity-80 whitespace-pre-line">{data.client.address}</div>
              <div className="text-sm opacity-80">{data.client.email}</div>
            </div>
            <div className="text-right text-sm opacity-80">
              {data.company.iban && <div>IBAN: {data.company.iban}</div>}
              {data.company.swift && <div>SWIFT/BIC: {data.company.swift}</div>}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200/60 dark:border-white/10">
            <table className="w-full text-sm">
              <thead className={`${theme === "dark" ? "bg-slate-800" : "bg-slate-100"}`}>
                <tr>
                  <th className="py-2 px-3 text-left">Description</th>
                  <th className="py-2 px-3 text-right">Qty</th>
                  <th className="py-2 px-3 text-right">Unit</th>
                  <th className="py-2 px-3 text-right">Tax %</th>
                  <th className="py-2 px-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((it) => {
                  const line = (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
                  const tax = line * ((Number(it.taxRate) || 0) / 100);
                  const ttl = line + tax;
                  return (
                    <tr key={it.id} className="border-t border-slate-200/60 dark:border-white/10">
                      <td className="py-2 px-3">{it.description || "—"}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{Number(it.quantity) || 0}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{fmt(it.unitPrice, data.invoice.currency)}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{Number(it.taxRate) || 0}%</td>
                      <td className="py-2 px-3 text-right tabular-nums">{fmt(ttl, data.invoice.currency)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mt-6">
            <div className="text-sm opacity-80 whitespace-pre-line">{data.invoice.notes}</div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex justify-between w-full md:w-80">
                <span className="opacity-80">Subtotal</span>
                <span className="tabular-nums">{fmt(subtotal, data.invoice.currency)}</span>
              </div>
              <div className="flex justify-between w-full md:w-80">
                <span className="opacity-80">Discount ({Number(data.invoice.discountPct) || 0}%)</span>
                <span className="tabular-nums">- {fmt(discountAmt, data.invoice.currency)}</span>
              </div>
              <div className="flex justify-between w-full md:w-80">
                <span className="opacity-80">Tax</span>
                <span className="tabular-nums">{fmt(totalTax, data.invoice.currency)}</span>
              </div>
              <div className="h-px w-full md:w-80 bg-slate-200/60 dark:bg-white/10 my-2" />
              <div className="flex justify-between w-full md:w-80 text-lg font-semibold">
                <span>Total</span>
                <span className="tabular-nums">{fmt(total, data.invoice.currency)}</span>
              </div>
            </div>
          </div>

          <div className="mt-8 text-xs opacity-70">
            <div>Payment details: {data.company.iban} {data.company.swift ? `• ${data.company.swift}` : ""}</div>
            <div>Thank you for your business.</div>
          </div>
        </section>

        <div className="flex items-center justify-between mt-6">
          <div className="flex gap-2">
            <button onClick={resetToSample} className="px-3 py-2 rounded-xl border border-slate-300/40">Reset sample</button>
            <button onClick={() => setData(prev => ({ ...prev, items: prev.items.length ? prev.items : [defaultItem()] }))} className="px-3 py-2 rounded-xl border border-slate-300/40">Ensure 1 item</button>
          </div>
          <div className="text-sm opacity-70">Autosaves locally • Export JSON for backup</div>
        </div>
      </div>
    </div>
  );
}
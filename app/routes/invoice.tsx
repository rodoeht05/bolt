import { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

interface InvoiceData {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  companyName: string;
  companyAddress: string;
  companyEmail: string;
  companyPhone: string;
  clientName: string;
  clientAddress: string;
  clientEmail: string;
  currency: string;
  lineItems: LineItem[];
  notes: string;
  logo: string;
}

const currencies = [
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
  { code: 'NOK', symbol: 'kr' },
  { code: 'SEK', symbol: 'kr' },
  { code: 'DKK', symbol: 'kr' },
];

export default function Invoice() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    invoiceNumber: 'INV-001',
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    companyName: 'Your Company Name',
    companyAddress: '123 Business Street\nCity, State 12345',
    companyEmail: 'contact@yourcompany.com',
    companyPhone: '+1 (555) 123-4567',
    clientName: 'Client Name',
    clientAddress: '456 Client Avenue\nClient City, State 67890',
    clientEmail: 'client@email.com',
    currency: 'USD',
    lineItems: [
      {
        id: '1',
        description: 'Service or Product',
        quantity: 1,
        unitPrice: 100,
        taxRate: 10,
      },
    ],
    notes: 'Thank you for your business!',
    logo: '',
  });

  const invoiceRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedData = localStorage.getItem('invoiceData');
    if (savedData) {
      setInvoiceData(JSON.parse(savedData));
    }
    
    const savedTheme = localStorage.getItem('darkMode');
    if (savedTheme) {
      setIsDarkMode(JSON.parse(savedTheme));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('invoiceData', JSON.stringify(invoiceData));
  }, [invoiceData]);

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const addLineItem = () => {
    const newItem: LineItem = {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      taxRate: 0,
    };
    setInvoiceData(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, newItem],
    }));
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setInvoiceData(prev => ({
      ...prev,
      lineItems: prev.lineItems.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  };

  const removeLineItem = (id: string) => {
    setInvoiceData(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter(item => item.id !== id),
    }));
  };

  const calculateSubtotal = () => {
    return invoiceData.lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const calculateTotalTax = () => {
    return invoiceData.lineItems.reduce((sum, item) => {
      const itemTotal = item.quantity * item.unitPrice;
      return sum + (itemTotal * item.taxRate / 100);
    }, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTotalTax();
  };

  const getCurrencySymbol = () => {
    return currencies.find(c => c.code === invoiceData.currency)?.symbol || '$';
  };

  const formatCurrency = (amount: number) => {
    const symbol = getCurrencySymbol();
    return `${symbol}${amount.toFixed(2)}`;
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setInvoiceData(prev => ({
          ...prev,
          logo: e.target?.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const exportToPDF = async () => {
    if (!invoiceRef.current) return;

    try {
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`invoice-${invoiceData.invoiceNumber}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  const exportToJSON = () => {
    const dataStr = JSON.stringify(invoiceData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `invoice-${invoiceData.invoiceNumber}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const importFromJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target?.result as string);
          setInvoiceData(importedData);
        } catch (error) {
          alert('Error importing file. Please check the file format.');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Invoice Generator</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>
            <button
              onClick={exportToPDF}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Export PDF
            </button>
            <button
              onClick={exportToJSON}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Export JSON
            </button>
            <label className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors cursor-pointer">
              Import JSON
              <input
                type="file"
                accept=".json"
                onChange={importFromJSON}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form Section */}
          <div className="space-y-6">
            {/* Company Information */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Company Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Company Logo
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Company Name"
                  value={invoiceData.companyName}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, companyName: e.target.value }))}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <textarea
                  placeholder="Company Address"
                  value={invoiceData.companyAddress}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, companyAddress: e.target.value }))}
                  rows={3}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <input
                  type="email"
                  placeholder="Company Email"
                  value={invoiceData.companyEmail}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, companyEmail: e.target.value }))}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <input
                  type="tel"
                  placeholder="Company Phone"
                  value={invoiceData.companyPhone}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, companyPhone: e.target.value }))}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Invoice Details */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Invoice Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Invoice Number"
                  value={invoiceData.invoiceNumber}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                  className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <select
                  value={invoiceData.currency}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, currency: e.target.value }))}
                  className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {currencies.map(currency => (
                    <option key={currency.code} value={currency.code}>
                      {currency.code} ({currency.symbol})
                    </option>
                  ))}
                </select>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Invoice Date
                  </label>
                  <input
                    type="date"
                    value={invoiceData.date}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={invoiceData.dueDate}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Client Information */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Client Information</h2>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Client Name"
                  value={invoiceData.clientName}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, clientName: e.target.value }))}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <textarea
                  placeholder="Client Address"
                  value={invoiceData.clientAddress}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, clientAddress: e.target.value }))}
                  rows={3}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <input
                  type="email"
                  placeholder="Client Email"
                  value={invoiceData.clientEmail}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, clientEmail: e.target.value }))}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Line Items</h2>
                <button
                  onClick={addLineItem}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Item
                </button>
              </div>
              <div className="space-y-4">
                {invoiceData.lineItems.map((item) => (
                  <div key={item.id} className="grid grid-cols-1 md:grid-cols-6 gap-2 p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                    <input
                      type="text"
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                      className="md:col-span-2 p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                      className="p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <input
                      type="number"
                      placeholder="Unit Price"
                      value={item.unitPrice}
                      onChange={(e) => updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                      className="p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <input
                      type="number"
                      placeholder="Tax %"
                      value={item.taxRate}
                      onChange={(e) => updateLineItem(item.id, 'taxRate', parseFloat(e.target.value) || 0)}
                      className="p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <button
                      onClick={() => removeLineItem(item.id)}
                      className="p-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Notes</h2>
              <textarea
                placeholder="Additional notes or payment terms..."
                value={invoiceData.notes}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, notes: e.target.value }))}
                rows={4}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Invoice Preview */}
          <div className="lg:sticky lg:top-8">
            <div className="bg-white p-8 rounded-lg shadow-lg border border-gray-200" ref={invoiceRef}>
              {/* Invoice Header */}
              <div className="flex justify-between items-start mb-8">
                <div>
                  {invoiceData.logo && (
                    <img src={invoiceData.logo} alt="Company Logo" className="h-16 w-auto mb-4" />
                  )}
                  <h1 className="text-3xl font-bold text-gray-900">INVOICE</h1>
                  <p className="text-gray-600">#{invoiceData.invoiceNumber}</p>
                </div>
                <div className="text-right">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">{invoiceData.companyName}</h2>
                  <div className="text-gray-600 text-sm whitespace-pre-line">
                    {invoiceData.companyAddress}
                  </div>
                  <div className="text-gray-600 text-sm mt-2">
                    <p>{invoiceData.companyEmail}</p>
                    <p>{invoiceData.companyPhone}</p>
                  </div>
                </div>
              </div>

              {/* Invoice Details */}
              <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Bill To:</h3>
                  <div className="text-gray-600">
                    <p className="font-medium">{invoiceData.clientName}</p>
                    <div className="whitespace-pre-line text-sm">{invoiceData.clientAddress}</div>
                    <p className="text-sm">{invoiceData.clientEmail}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="mb-2">
                    <span className="text-gray-600">Invoice Date: </span>
                    <span className="font-medium">{new Date(invoiceData.date).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Due Date: </span>
                    <span className="font-medium">{new Date(invoiceData.dueDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="mb-8">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-300">
                      <th className="text-left py-2 font-semibold text-gray-900">Description</th>
                      <th className="text-right py-2 font-semibold text-gray-900">Qty</th>
                      <th className="text-right py-2 font-semibold text-gray-900">Unit Price</th>
                      <th className="text-right py-2 font-semibold text-gray-900">Tax</th>
                      <th className="text-right py-2 font-semibold text-gray-900">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceData.lineItems.map((item) => {
                      const itemTotal = item.quantity * item.unitPrice;
                      const itemTax = itemTotal * item.taxRate / 100;
                      const itemTotalWithTax = itemTotal + itemTax;
                      
                      return (
                        <tr key={item.id} className="border-b border-gray-200">
                          <td className="py-3 text-gray-900">{item.description}</td>
                          <td className="py-3 text-right text-gray-600">{item.quantity}</td>
                          <td className="py-3 text-right text-gray-600">{formatCurrency(item.unitPrice)}</td>
                          <td className="py-3 text-right text-gray-600">{formatCurrency(itemTax)}</td>
                          <td className="py-3 text-right font-medium text-gray-900">{formatCurrency(itemTotalWithTax)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="flex justify-end mb-8">
                <div className="w-64">
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium text-gray-900">{formatCurrency(calculateSubtotal())}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-600">Tax:</span>
                    <span className="font-medium text-gray-900">{formatCurrency(calculateTotalTax())}</span>
                  </div>
                  <div className="flex justify-between py-3 border-b-2 border-gray-300">
                    <span className="text-lg font-semibold text-gray-900">Total:</span>
                    <span className="text-lg font-bold text-gray-900">{formatCurrency(calculateTotal())}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {invoiceData.notes && (
                <div className="border-t border-gray-200 pt-6">
                  <h4 className="font-semibold text-gray-900 mb-2">Notes:</h4>
                  <p className="text-gray-600 text-sm whitespace-pre-line">{invoiceData.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
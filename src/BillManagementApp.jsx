import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Trash2,
  Download,
  FileText,
  Calendar,
  User,
  MapPin,
  Hash,
  DollarSign,
  Package,
  Save,
  CheckCircle,
  AlertCircle,
  Percent,
  Image,
  RefreshCw,
  Building2,
  CreditCard,
  Edit3,
  Settings,
  X,
  Banknote,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Swal from "sweetalert2";
const BillManagementApp = () => {
   const API_BASE_URL = "https://billing-software-backendd-main.onrender.com";

  const getBillTypeLabel = (type) => {
    const labels = {
      purchase_order: "Purchase Order",
      proforma_invoice: "Proforma Invoice",
      invoice: "Invoice",
    };
    return labels[type] || "Purchase Order";
  };

  const getBillTypeColor = (type) => {
    const colors = {
      purchase_order: "bg-blue-100 text-blue-800",
      proforma_invoice: "bg-purple-100 text-purple-800",
      invoice: "bg-green-100 text-green-800",
    };
    return colors[type] || "bg-blue-100 text-blue-800";
  };

  const [bills, setBills] = useState([]);
  const [bankDetails, setBankDetails] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showBankForm, setShowBankForm] = useState(false);
  const [showBankManagement, setShowBankManagement] = useState(false);
  const [editingBank, setEditingBank] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastCreatedBill, setLastCreatedBill] = useState(null);
  const [isConnected, setIsConnected] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [showInactiveCompanies, setShowInactiveCompanies] = useState(false);
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [showCompanyManagement, setShowCompanyManagement] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date-desc");
  const [filterCurrency, setFilterCurrency] = useState("");
  const [filterType, setFilterType] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [companyFormData, setCompanyFormData] = useState({
    name: "",
    registeredOffice: "",
    principalPlaceOfBusiness: "",
    gstin: "",
    pan: "",
    iec: "",
    emails: ["sales@ingredientz.co", "procurement@ingredientz.co"],
    isActive: true,
  });

  // Update bill form data to include type and companyId

  const [formData, setFormData] = useState({
    poNo: "",
    date: new Date().toISOString().split("T")[0],
    customerName: "",
    customerAddress: "",
    customerGSTIN: "",
    deliveryAddress: "",
    items: [
      {
        description: "",
        hsn: "",
        quantity: "",
        unit: "kg",
        unitPrice: "",
        currency: "INR",
      },
    ],
    companyId: "",
    taxPercent: 0,
    type: "purchase_order",
    paymentTerms: "50% Advance",
    deliveryTerms: "1 Week",
    modeOfDispatch: "",
    billingInstructions: "",
    remarks: "",
    emails: ["sales@ingredientz.co", "procurement@ingredientz.co"],
    website: "www.ingredientz.co",
    termsAndConditions: [
      "Supply shall commence only after pre-shipment samples are approved in writing by Proingredientz. If samples fail, all advances must be refunded immediately in full.",
      "Supplier guarantees that goods conform to agreed specifications, COA (Certificate of Analysis), and applicable Indian/International quality standards. Any deviation or misrepresentation will be treated as breach of contract.",
      "Proingredientz reserves the right to reject goods not meeting quality, specifications, or agreed delivery timelines. All costs of return/replacement shall be borne by the supplier.",
      "Each consignment must be accompanied by Invoice, Packing List, COA, and relevant regulatory documents. Non-compliance can result in rejection.",
      "All disputes subject to Mumbai, Maharashtra jurisdiction.",
      "Supplier shall not disclose Proingredientz's order details, product specifications, or client information to third parties without written approval.",
    ],
    bankId: "",
    image: null,
  });
  const billTypeOptions = [
    { value: "purchase_order", label: "Purchase Order" },
    { value: "proforma_invoice", label: "Proforma Invoice" },
    { value: "invoice", label: "Invoice" },
  ];
  const fetchCompanies = async (includeInactive = false) => {
    try {
      const endpoint = includeInactive
        ? "/api/companies?includeInactive=true"
        : "/api/companies";
      const response = await apiCall(endpoint);
      console.log(
        "fetchCompanies() -> endpoint:",
        endpoint,
        "response:",
        response
      );
      // Normalise response: backend may return an array or an object { companies: [...] }
      const companyList = Array.isArray(response)
        ? response
        : response.companies || response.data || [];
      console.log("fetchCompanies() -> companyList:", companyList);
      setCompanies(companyList);

      // If there's at least one company, set a sensible default selection
      if (companyList.length > 0) {
        const defaultCompany =
          companyList.find((c) => c.isActive !== false) || companyList[0];
        // Only set default company on initial load when formData.companyId is empty
        setFormData((prev) => {
          if (prev.companyId) return prev;
          return {
            ...prev,
            companyId: defaultCompany._id || defaultCompany.id || "",
            emails: Array.isArray(defaultCompany.emails)
              ? defaultCompany.emails
              : defaultCompany.emails
              ? String(defaultCompany.emails)
                  .split(",")
                  .map((s) => s.trim())
              : [],
            website: defaultCompany.website || "",
          };
        });
      }
    } catch (error) {
      console.error("Error fetching companies:", error);
      Swal.fire({
        icon: "error",
        title: "Failed to Fetch Companies",
        text: error.message,
        confirmButtonColor: "#4F46E5",
      });
    }
  };
  const [bankFormData, setBankFormData] = useState({
    bankName: "",
    accountName: "",
    accountNumber: "",
    ifscCode: "",
    swiftCode: "",
    branchName: "",
    branchAddress: "",
    isActive: true,
  });

  const unitOptions = ["kg", "mt", "lbs", "tons", "grams"];

  const unitToKgConversion = {
    kg: 1,
    mt: 1000,
    lbs: 0.453592,
    tons: 1000,
    grams: 0.001,
  };

  const currencyOptions = [
    "INR",
    "USD",
    "EUR",
    "GBP",
    "JPY",
    "AUD",
    "CAD",
    "CHF",
    "CNY",
    "SEK",
    "NZD",
    "MXN",
    "SGD",
    "HKD",
    "NOK",
    "BRL",
    "ZAR",
    "RUB",
  ];

  const apiCall = async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          // Use default error message
        }
        throw new Error(errorMessage);
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return await response.json();
      }

      return response;
    } catch (error) {
      if (error.name === "TypeError" && error.message.includes("fetch")) {
        throw new Error(
          `Cannot connect to server at ${API_BASE_URL}. Please ensure your backend is running.`
        );
      }
      throw error;
    }
  };

  const fetchBankDetails = async () => {
    try {
      const response = await apiCall("/api/bank-details");
      const banks = Array.isArray(response)
        ? response
        : response.bankDetails || [];
      setBankDetails(banks);

      // Auto-select ICICI bank if available
      const iciciBank = banks.find(
        (bank) => bank.bankName && bank.bankName.toLowerCase().includes("icici")
      );
      if (iciciBank && !formData.bankId) {
        setFormData((prev) => ({ ...prev, bankId: iciciBank._id }));
      }
    } catch (error) {
      console.error("Error fetching bank details:", error);
      Swal.fire({
        icon: "error",
        title: "Failed to Fetch Bank Details",
        text: error.message,
        confirmButtonColor: "#4F46E5",
      });
    }
  };

  const handleBankSubmit = async (e) => {
    e.preventDefault();
    if (
      !bankFormData.bankName ||
      !bankFormData.accountName ||
      !bankFormData.accountNumber ||
      !bankFormData.ifscCode
    ) {
      Swal.fire({
        icon: "warning",
        title: "Missing Information",
        text: "Please fill in all required bank details",
        confirmButtonColor: "#4F46E5",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const url = editingBank
        ? `/api/bank-details/${editingBank._id}`
        : "/api/bank-details";
      const method = editingBank ? "PUT" : "POST";

      const response = await apiCall(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bankFormData),
      });

      const bankData = response.bankDetail || response;

      if (editingBank) {
        setBankDetails((prev) =>
          prev.map((bank) => (bank._id === editingBank._id ? bankData : bank))
        );
        Swal.fire({
          icon: "success",
          title: "Updated!",
          text: "Bank details updated successfully",
          timer: 2000,
          showConfirmButton: false,
          toast: true,
          position: "top-end",
        });
      } else {
        setBankDetails((prev) => [...prev, bankData]);
        Swal.fire({
          icon: "success",
          title: "Added!",
          text: "Bank details added successfully",
          timer: 2000,
          showConfirmButton: false,
          toast: true,
          position: "top-end",
        });
      }

      resetBankForm();
      setShowBankForm(false);
      setEditingBank(null);
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Save Failed",
        text: error.message,
        confirmButtonColor: "#4F46E5",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBankEdit = (bank) => {
    setBankFormData({
      bankName: bank.bankName || "",
      accountName: bank.accountName || "",
      accountNumber: bank.accountNumber || "",
      ifscCode: bank.ifscCode || bank.ifsc || "",
      swiftCode: bank.swiftCode || bank.swift || "",
      branchName: bank.branchName || "",
      branchAddress: bank.branchAddress || "",
      isActive: bank.isActive !== undefined ? bank.isActive : true,
    });
    setEditingBank(bank);
    setShowBankForm(true);
  };

  const handleBankDelete = async (bankId) => {
    if (!window.confirm("Are you sure you want to delete this bank account?"))
      return;

    try {
      await apiCall(`/api/bank-details/${bankId}`, { method: "DELETE" });
      setBankDetails((prev) => prev.filter((bank) => bank._id !== bankId));
      Swal.fire({
        icon: "success",
        title: "Deleted!",
        text: "Bank account deleted successfully",
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: "top-end",
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Delete Failed",
        text: error.message,
        confirmButtonColor: "#4F46E5",
      });
    }
  };

  const resetBankForm = () => {
    setBankFormData({
      bankName: "",
      accountName: "",
      accountNumber: "",
      ifscCode: "",
      swiftCode: "",
      branchName: "",
      branchAddress: "",
      isActive: true,
    });
  };

  const checkConnection = async () => {
    try {
      await apiCall("/api/bills/health");
      setIsConnected(true);
      await fetchBankDetails();
    } catch (error) {
      setIsConnected(false);
      Swal.fire({
        icon: "error",
        title: "Connection Failed",
        text: error.message,
        confirmButtonColor: "#4F46E5",
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === "file") {
      const file = files[0];
      if (file) {
        const allowedTypes = [
          "image/jpeg",
          "image/jpg",
          "image/png",
          "image/gif",
        ];
        if (!allowedTypes.includes(file.type)) {
          Swal.fire({
            icon: "warning",
            title: "Invalid File Type",
            text: "Please select a valid image file (JPG, PNG, GIF)",
            confirmButtonColor: "#4F46E5",
          });
          return;
        }

        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
          Swal.fire({
            icon: "warning",
            title: "File Too Large",
            text: "File size should be less than 5MB",
            confirmButtonColor: "#4F46E5",
          });
          return;
        }

        setFormData((prev) => ({ ...prev, [name]: file }));
        const reader = new FileReader();
        reader.onload = (e) => setImagePreview(e.target.result);
        reader.readAsDataURL(file);
      } else {
        setFormData((prev) => ({ ...prev, [name]: null }));
        setImagePreview(null);
      }
    } else {
      // If company is changed, prefill emails and website from selected company
      if (name === "companyId") {
        const selectedId = value;
        const selectedCompany = companies.find(
          (c) => (c._id || c.id) === selectedId
        );
        setFormData((prev) => ({
          ...prev,
          companyId: selectedId,
          emails: selectedCompany?.emails || [],
          website: selectedCompany?.website || "",
        }));
      } else {
        setFormData((prev) => ({ ...prev, [name]: value }));
      }
    }
  };

  const handleBankInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setBankFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleArrayInputChange = (field, value) => {
    if (field === "emails") {
      const emailArray = value
        .split(",")
        .map((email) => email.trim())
        .filter((email) => email);
      setFormData((prev) => ({ ...prev, [field]: emailArray }));
    } else if (field === "termsAndConditions") {
      const termsArray = value.split("\n").filter((term) => term.trim());
      setFormData((prev) => ({ ...prev, [field]: termsArray }));
    }
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setFormData((prev) => ({ ...prev, items: updatedItems }));
  };

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          description: "",
          hsn: "",
          quantity: "",
          unit: "kg",
          unitPrice: "",
          currency: "INR",
        },
      ],
    }));
  };

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      setFormData((prev) => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index),
      }));
    }
  };

  const validateForm = () => {
    const errors = [];
    if (!formData.customerName?.trim())
      errors.push("Customer name is required");
    if (!formData.customerAddress?.trim())
      errors.push("Customer address is required");
    if (!formData.deliveryAddress?.trim())
      errors.push("Delivery address is required");
    if (!formData.date) errors.push("Date is required");
    if (!formData.items || formData.items.length === 0)
      errors.push("At least one item is required");

    formData.items.forEach((item, index) => {
      if (!item.description?.trim())
        errors.push(`Item ${index + 1}: Description is required`);
      if (!item.quantity || parseFloat(item.quantity) <= 0)
        errors.push(`Item ${index + 1}: Valid quantity is required`);
      if (!item.unitPrice || parseFloat(item.unitPrice) <= 0)
        errors.push(`Item ${index + 1}: Valid unit price is required`);
    });

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isConnected) {
      Swal.fire({
        icon: "error",
        title: "Connection Error",
        text: "Cannot submit bill: Server connection failed",
        confirmButtonColor: "#4F46E5",
      });
      return;
    }

    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      Swal.fire({
        icon: "error",
        title: "Validation Failed",
        html: validationErrors.map((err) => `• ${err}`).join("<br>"),
        confirmButtonColor: "#4F46E5",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const formDataToSend = new FormData();

      // Use the first item's currency as the bill currency, or default to INR
      const billCurrency = formData.items[0]?.currency || "INR";

      const cleanedData = {
        customerName: formData.customerName.trim(),
        customerAddress: formData.customerAddress.trim(),
        customerGSTIN: formData.customerGSTIN?.trim() || "",
        deliveryAddress: formData.deliveryAddress.trim(),
        date: formData.date,
        items: formData.items.map((item) => ({
          description: item.description.trim(),
          hsn: item.hsn?.trim() || "",
          quantity: parseFloat(item.quantity),
          unit: item.unit,
          unitPrice: parseFloat(item.unitPrice),
          currency: item.currency,
        })),
        currency: billCurrency,
        taxPercent: parseFloat(formData.taxPercent),
        paymentTerms: formData.paymentTerms.trim(),
        deliveryTerms: formData.deliveryTerms.trim(),
        modeOfDispatch: formData.modeOfDispatch?.trim() || "",
        billingInstructions: formData.billingInstructions?.trim() || "",
        remarks: formData.remarks?.trim() || "",
        emails: formData.emails,
        website: formData.website.trim(),
        type: formData.type,
        companyId: formData.companyId || null,
        termsAndConditions: formData.termsAndConditions,
        bankId: formData.bankId || null,
      };

      Object.keys(cleanedData).forEach((key) => {
        if (
          key === "items" ||
          key === "emails" ||
          key === "termsAndConditions"
        ) {
          formDataToSend.append(key, JSON.stringify(cleanedData[key]));
        } else {
          formDataToSend.append(key, cleanedData[key]);
        }
      });

      if (formData.image) {
        formDataToSend.append("image", formData.image);
      }

      const response = await apiCall("/api/bills", {
        method: "POST",
        body: formDataToSend,
      });

      if (response.bill || response.success) {
        const newBill = response.bill || response;
        // Refresh the bills list from server to ensure consistency
        await fetchBills();
        setCurrentPage(1);
        setLastCreatedBill(newBill);

        Swal.fire({
          icon: "success",
          title: "Bill Created Successfully!",
          text: "Would you like to download the PDF now?",
          showCancelButton: true,
          confirmButtonText: "Yes, download",
          cancelButtonText: "No, skip",
          confirmButtonColor: "#4F46E5",
        }).then((result) => {
          if (result.isConfirmed) {
            downloadPdf(newBill._id || newBill.id, newBill.poNo);
          }
          resetForm();
          setShowForm(false);
        });
        console.log("New bill created:", newBill);
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Failed to Create Bill",
        text: error.message,
        confirmButtonColor: "#4F46E5",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    const iciciBank = bankDetails.find(
      (bank) => bank.bankName && bank.bankName.toLowerCase().includes("icici")
    );
    // Prefill emails and website from default company (if any)
    const defaultCompany =
      companies.find((c) => c.isActive !== false) || companies[0] || null;

    setFormData({
      poNo: "",
      date: new Date().toISOString().split("T")[0],
      customerName: "",
      customerAddress: "",
      customerGSTIN: "",
      deliveryAddress: "",
      items: [
        {
          description: "",
          hsn: "",
          quantity: "",
          unit: "kg",
          unitPrice: "",
          currency: "INR",
        },
      ],
      companyId: defaultCompany ? defaultCompany._id || defaultCompany.id : "",
      taxPercent: 0,
      paymentTerms: "50% Advance",
      deliveryTerms: "1 Week",
      modeOfDispatch: "",
      billingInstructions: "",
      remarks: "",
      emails:
        defaultCompany && Array.isArray(defaultCompany.emails)
          ? defaultCompany.emails
          : defaultCompany && defaultCompany.emails
          ? String(defaultCompany.emails)
              .split(",")
              .map((s) => s.trim())
          : [],
      website: defaultCompany ? defaultCompany.website || "" : "",
      termsAndConditions: [
        "Supply shall commence only after pre-shipment samples are approved in writing by Proingredientz. If samples fail, all advances must be refunded immediately in full.",
        "Supplier guarantees that goods conform to agreed specifications, COA (Certificate of Analysis), and applicable Indian/International quality standards. Any deviation or misrepresentation will be treated as breach of contract.",
        "Proingredientz reserves the right to reject goods not meeting quality, specifications, or agreed delivery timelines. All costs of return/replacement shall be borne by the supplier.",
        "Each consignment must be accompanied by Invoice, Packing List, COA, and relevant regulatory documents. Non-compliance can result in rejection.",
        "All disputes subject to Mumbai, Maharashtra jurisdiction.",
        "Supplier shall not disclose Proingredientz's order details, product specifications, or client information to third parties without written approval.",
      ],
      bankId: iciciBank ? iciciBank._id : "",
      image: null,
    });
    setImagePreview(null);
  };

  const fetchBills = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      const response = await apiCall("/api/bills");
      setBills(Array.isArray(response) ? response : response.bills || []);

      Swal.fire({
        icon: "success",
        title: "Bills Updated!",
        text: "Bills list has been refreshed successfully",
        toast: true,
        position: "top-end",
        timer: 2000,
        showConfirmButton: false,
        timerProgressBar: true,
        background: "#4F46E5",
        color: "#ffffff",
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Failed to Fetch Bills",
        text: error.message,
        confirmButtonColor: "#4F46E5",
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: true,
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const downloadPdf = async (billId, poNo) => {
    try {
      const response = await apiCall(`/api/bills/${billId}/download`);
      if (response instanceof Response) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = `Bill-${poNo}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        Swal.fire({
          icon: "success",
          title: "Download Complete",
          text: `Bill ${poNo} downloaded successfully`,
          timer: 2000,
          showConfirmButton: false,
          toast: true,
          position: "top-end",
        });
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Download Failed",
        text: error.message,
        confirmButtonColor: "#4F46E5",
      });
    }
  };

  const handleDeleteBill = async (billId) => {
    const result = await Swal.fire({
      title: "Delete Bill?",
      text: "This will permanently delete the bill.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d9534f",
      confirmButtonText: "Delete",
    });
    if (!result.isConfirmed) return;

    try {
      await apiCall(`/api/bills/${billId}`, { method: "DELETE" });
      // Refresh the bills list from server
      await fetchBills();
      setCurrentPage(1);
      Swal.fire({
        icon: "success",
        title: "Deleted",
        text: "Bill deleted successfully",
        timer: 1400,
        showConfirmButton: false,
        toast: true,
        position: "top-end",
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Delete Failed",
        text: error.message,
        confirmButtonColor: "#4F46E5",
      });
    }
  };

  useEffect(() => {
    checkConnection();
    fetchBills();
    // initial fetch: only active companies for bill form
    fetchCompanies(false);
  }, []);

  // When opening Company Management, fetch companies and optionally include inactive ones
  useEffect(() => {
    if (showCompanyManagement) {
      fetchCompanies(showInactiveCompanies);
    }
  }, [showCompanyManagement, showInactiveCompanies]);

  const filteredAndSortedBills = useMemo(() => {
    let filtered = [...bills];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (bill) =>
          bill.poNo?.toLowerCase().includes(query) ||
          bill.customerName?.toLowerCase().includes(query) ||
          bill.customerGSTIN?.toLowerCase().includes(query)
      );
    }

    if (filterCurrency) {
      filtered = filtered.filter((bill) => bill.currency === filterCurrency);
    }
    if (filterType) {
      filtered = filtered.filter((bill) => bill.type === filterType);
    }
    const extractBillNumber = (billNumber) => {
      if (!billNumber) return 0;

      // Extract numbers from string (e.g., "INV-001" -> 1, "BILL123" -> 123)
      const matches = billNumber.match(/\d+/);
      return matches ? parseInt(matches[0], 10) : 0;
    };
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date-desc": // Latest First (newest to oldest)
          const dateB = b.date ? new Date(b.date).getTime() : 0;
          const dateA = a.date ? new Date(a.date).getTime() : 0;
          return dateB - dateA;
        case "date-asc": // Oldest First (oldest to newest)
          const dateA_asc = a.date ? new Date(a.date).getTime() : 0;
          const dateB_asc = b.date ? new Date(b.date).getTime() : 0;
          return dateA_asc - dateB_asc;
        case "amount-desc":
          return (Number(b.grandTotal) || 0) - (Number(a.grandTotal) || 0);
        case "amount-asc":
          return (Number(a.grandTotal) || 0) - (Number(b.grandTotal) || 0);
        case "currency":
          return (a.currency || "").localeCompare(b.currency || "");
        case "customer":
          return (a.customerName || "").localeCompare(b.customerName || "");
        default:
          return 0;
      }
    });

    // Helper function to extract numeric part from bill number

    return filtered;
  }, [bills, searchQuery, filterCurrency, filterType, sortBy]);

  const totalPages = Math.ceil(filteredAndSortedBills.length / itemsPerPage);
  const paginatedBills = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedBills.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedBills, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterCurrency, filterType, sortBy]);

  const availableCurrencies = useMemo(() => {
    const currencies = new Set(
      bills.map((bill) => bill.currency).filter(Boolean)
    );
    return Array.from(currencies).sort();
  }, [bills]);

  const renderBankManagement = () => (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <Banknote className="text-indigo-600" />
            Bank Account Management
          </h2>
          <p className="text-gray-600 mt-2">
            Manage your company's bank accounts for bills
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showInactiveCompanies}
              onChange={() => setShowInactiveCompanies((s) => !s)}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded"
            />
            <span className="text-gray-700">Show inactive</span>
          </label>
          <button
            onClick={() => {
              setEditingBank(null);
              resetBankForm();
              setShowBankForm(true);
            }}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Plus size={16} />
            Add Bank Account
          </button>
          <button
            onClick={() => setShowBankManagement(false)}
            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Back to Bills
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bankDetails.map((bank) => (
          <div
            key={bank._id}
            className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg p-6 border border-blue-200"
          >
            <div className="flex items-center justify-between mb-4">
              <CreditCard className="text-indigo-600" size={24} />
              <div className="flex gap-2">
                <button
                  onClick={() => handleBankEdit(bank)}
                  className="text-blue-600 hover:text-blue-800 transition-colors p-1"
                  title="Edit bank details"
                >
                  <Edit3 size={16} />
                </button>
                <button
                  onClick={() => handleBankDelete(bank._id)}
                  className="text-red-600 hover:text-red-800 transition-colors p-1"
                  title="Delete bank account"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <h3 className="font-bold text-gray-800 mb-2">{bank.bankName}</h3>
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-medium">Account:</span> {bank.accountName}
              </p>
              <p>
                <span className="font-medium">Number:</span>{" "}
                {bank.accountNumber}
              </p>
              <p>
                <span className="font-medium">IFSC:</span>{" "}
                {bank.ifscCode || bank.ifsc}
              </p>
              {(bank.swiftCode || bank.swift) && (
                <p>
                  <span className="font-medium">SWIFT:</span>{" "}
                  {bank.swiftCode || bank.swift}
                </p>
              )}
              {bank.branchName && (
                <p>
                  <span className="font-medium">Branch:</span> {bank.branchName}
                </p>
              )}
            </div>
            <div className="mt-4">
              <span
                className={`px-2 py-1 rounded-full text-xs ${
                  bank.isActive !== false
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {bank.isActive !== false ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        ))}

        {bankDetails.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Banknote size={48} className="mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">
              No bank accounts added yet. Add your first bank account!
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderBankForm = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-800">
              {editingBank ? "Edit Bank Account" : "Add New Bank Account"}
            </h2>
            <button
              onClick={() => {
                setShowBankForm(false);
                setEditingBank(null);
                resetBankForm();
              }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <form onSubmit={handleBankSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Bank Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="bankName"
                value={bankFormData.bankName}
                onChange={handleBankInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                placeholder="e.g., ICICI Bank"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Account Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="accountName"
                value={bankFormData.accountName}
                onChange={handleBankInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                placeholder="Account holder name"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Account Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="accountNumber"
                value={bankFormData.accountNumber}
                onChange={handleBankInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                placeholder="Account number"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                IFSC Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="ifscCode"
                value={bankFormData.ifscCode}
                onChange={handleBankInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                placeholder="IFSC code"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                SWIFT Code
              </label>
              <input
                type="text"
                name="swiftCode"
                value={bankFormData.swiftCode}
                onChange={handleBankInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                placeholder="SWIFT code (optional)"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Branch Name
              </label>
              <input
                type="text"
                name="branchName"
                value={bankFormData.branchName}
                onChange={handleBankInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                placeholder="Branch name (optional)"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Branch Address
            </label>
            <textarea
              name="branchAddress"
              value={bankFormData.branchAddress}
              onChange={handleBankInputChange}
              rows="3"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              placeholder="Branch address (optional)"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              name="isActive"
              id="isActive"
              checked={bankFormData.isActive}
              onChange={handleBankInputChange}
              className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label
              htmlFor="isActive"
              className="ml-2 block text-sm text-gray-700"
            >
              Active account
            </label>
          </div>

          <div className="flex gap-4 pt-6 border-t">
            <button
              type="button"
              onClick={() => {
                setShowBankForm(false);
                setEditingBank(null);
                resetBankForm();
              }}
              className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save size={20} />
                  {editingBank ? "Update Account" : "Add Account"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // --- Company management UI & handlers ---
  const handleCompanyInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCompanyFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const resetCompanyForm = () => {
    setCompanyFormData({
      name: "",
      registeredOffice: "",
      principalPlaceOfBusiness: "",
      gstin: "",
      pan: "",
      iec: "",
      emails: ["sales@ingredientz.co", "procurement@ingredientz.co"],
      website: "",
      isActive: true,
    });
    setEditingCompany(null);
  };

  const handleCompanySubmit = async (e) => {
    e.preventDefault();
    if (!companyFormData.name || !companyFormData.name.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Validation",
        text: "Company name is required",
        confirmButtonColor: "#4F46E5",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...companyFormData,
        emails: Array.isArray(companyFormData.emails)
          ? companyFormData.emails
          : String(companyFormData.emails || "")
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
      };

      // Ensure emails and website are present (backend model requires these)
      if (!payload.emails || !payload.emails.length) {
        Swal.fire({
          icon: "warning",
          title: "Validation",
          text: "At least one company email is required",
          confirmButtonColor: "#4F46E5",
        });
        setIsSubmitting(false);
        return;
      }

      if (!companyFormData.website || !String(companyFormData.website).trim()) {
        Swal.fire({
          icon: "warning",
          title: "Validation",
          text: "Company website is required",
          confirmButtonColor: "#4F46E5",
        });
        setIsSubmitting(false);
        return;
      }

      if (editingCompany && (editingCompany._id || editingCompany.id)) {
        console.log(
          "Updating company",
          editingCompany._id || editingCompany.id,
          payload
        );
        const resp = await apiCall(
          `/api/companies/${editingCompany._id || editingCompany.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );
        console.log("update company response:", resp);
        Swal.fire({
          icon: "success",
          title: "Updated",
          text: "Company updated",
          timer: 1500,
          showConfirmButton: false,
          toast: true,
          position: "top-end",
        });
      } else {
        console.log("Creating company", payload);
        const resp = await apiCall(`/api/companies`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        console.log("create company response:", resp);
        Swal.fire({
          icon: "success",
          title: "Created",
          text: "Company created",
          timer: 1500,
          showConfirmButton: false,
          toast: true,
          position: "top-end",
        });
      }

      await fetchCompanies();
      resetCompanyForm();
      setShowCompanyForm(false);
      setShowCompanyManagement(true);
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Failed",
        text: error.message,
        confirmButtonColor: "#4F46E5",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompanyEdit = (company) => {
    setCompanyFormData({
      name: company.name || "",
      registeredOffice: company.registeredOffice || "",
      principalPlaceOfBusiness: company.principalPlaceOfBusiness || "",
      gstin: company.gstin || "",
      pan: company.pan || "",
      iec: company.iec || "",
      emails: company.emails || [
        "sales@ingredientz.co",
        "procurement@ingredientz.co",
      ],
      website: company.website || "",
      isActive: company.isActive !== undefined ? company.isActive : true,
    });
    setEditingCompany(company);
    setShowCompanyForm(true);
  };

  const handleCompanyDelete = async (companyId) => {
    const result = await Swal.fire({
      title: "Delete Company?",
      text: "This action cannot be undone",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d9534f",
      confirmButtonText: "Delete",
    });
    if (!result.isConfirmed) return;

    try {
      await apiCall(`/api/companies/${companyId}`, { method: "DELETE" });
      await fetchCompanies();
      Swal.fire({
        icon: "success",
        title: "Deleted",
        timer: 1200,
        showConfirmButton: false,
        toast: true,
        position: "top-end",
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Failed to delete",
        text: error.message,
        confirmButtonColor: "#4F46E5",
      });
    }
  };

  const renderCompanyManagement = () => (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <Building2 className="text-teal-600" />
            Company Management
          </h2>
          <p className="text-gray-600 mt-2">Manage companies used on bills</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setEditingCompany(null);
              resetCompanyForm();
              setShowCompanyForm(true);
            }}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Plus size={16} />
            Add Company
          </button>
          <button
            onClick={() => setShowCompanyManagement(false)}
            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Back to Bills
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {companies.map((c) => (
          <div
            key={c._id || c.id}
            className="bg-gradient-to-br from-teal-50 to-emerald-100 rounded-lg p-6 border border-teal-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-800 mb-2">{c.name}</h3>
                  {c.isActive === false && (
                    <span className="inline-block text-xs px-2 py-1 rounded bg-red-100 text-red-800">
                      Inactive
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">{c.registeredOffice}</p>
                <p className="text-sm text-gray-600">GSTIN: {c.gstin}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleCompanyEdit(c)}
                  className="text-blue-600 hover:text-blue-800 p-1"
                >
                  <Edit3 size={16} />
                </button>
                <button
                  onClick={() => handleCompanyDelete(c._id || c.id)}
                  className="text-red-600 hover:text-red-800 p-1"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-medium">Emails:</span>{" "}
                {(c.emails || []).join(", ")}
              </p>
              {c.website && (
                <p>
                  <span className="font-medium">Website:</span>{" "}
                  <a
                    href={c.website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 hover:underline"
                  >
                    {c.website}
                  </a>
                </p>
              )}
              <p>
                <span className="font-medium">Active:</span>{" "}
                {c.isActive !== false ? "Yes" : "No"}
              </p>
            </div>
          </div>
        ))}

        {companies.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Building2 size={48} className="mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">
              No companies added yet. Add your first company!
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderCompanyForm = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-800">
              {editingCompany ? "Edit Company" : "Add New Company"}
            </h2>
            <button
              onClick={() => {
                setShowCompanyForm(false);
                resetCompanyForm();
              }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <form onSubmit={handleCompanySubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={companyFormData.name}
                onChange={handleCompanyInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="Company name"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Registered Office
              </label>
              <input
                type="text"
                name="registeredOffice"
                value={companyFormData.registeredOffice}
                onChange={handleCompanyInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="Registered office"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Principal Place of Business
              </label>
              <input
                type="text"
                name="principalPlaceOfBusiness"
                value={companyFormData.principalPlaceOfBusiness}
                onChange={handleCompanyInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="Principal place of business"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                GSTIN
              </label>
              <input
                type="text"
                name="gstin"
                value={companyFormData.gstin}
                onChange={handleCompanyInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="GSTIN"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                PAN
              </label>
              <input
                type="text"
                name="pan"
                value={companyFormData.pan}
                onChange={handleCompanyInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="PAN"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                IEC
              </label>
              <input
                type="text"
                name="iec"
                value={companyFormData.iec}
                onChange={handleCompanyInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="IEC"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Emails
            </label>
            <input
              type="text"
              name="emails"
              value={
                Array.isArray(companyFormData.emails)
                  ? companyFormData.emails.join(", ")
                  : companyFormData.emails
              }
              onChange={(e) =>
                setCompanyFormData((prev) => ({
                  ...prev,
                  emails: e.target.value,
                }))
              }
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="comma separated emails"
            />
            <p className="text-xs text-gray-500 mt-1">
              Separate multiple emails with commas
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Website <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="website"
              value={companyFormData.website || ""}
              onChange={handleCompanyInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="https://example.com"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              name="isActive"
              id="companyIsActive"
              checked={companyFormData.isActive}
              onChange={handleCompanyInputChange}
              className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label
              htmlFor="companyIsActive"
              className="ml-2 block text-sm text-gray-700"
            >
              Active company
            </label>
          </div>

          <div className="flex gap-4 pt-6 border-t">
            <button
              type="button"
              onClick={() => {
                setShowCompanyForm(false);
                resetCompanyForm();
              }}
              className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save size={20} />{" "}
                  {editingCompany ? "Update Company" : "Add Company"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (showCompanyManagement) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-7xl mx-auto">
          {isConnected !== null && (
            <div
              className={`mb-4 px-4 py-2 rounded-lg flex items-center gap-2 ${
                isConnected
                  ? "bg-green-50 border border-green-200 text-green-800"
                  : "bg-red-50 border border-red-200 text-red-800"
              }`}
            >
              {isConnected ? (
                <CheckCircle size={16} className="text-green-600" />
              ) : (
                <AlertCircle size={16} className="text-red-600" />
              )}

              {!isConnected && (
                <button
                  onClick={fetchCompanies}
                  disabled={isRefreshing}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-70"
                >
                  <RefreshCw size={16} />
                  {isRefreshing ? "Refreshing..." : "Refresh"}
                </button>
              )}
            </div>
          )}

          {renderCompanyManagement()}
          {showCompanyForm && renderCompanyForm()}
        </div>
      </div>
    );
  }

  if (showBankManagement) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-7xl mx-auto">
          {isConnected !== null && (
            <div
              className={`mb-4 px-4 py-2 rounded-lg flex items-center gap-2 ${
                isConnected
                  ? "bg-green-50 border border-green-200 text-green-800"
                  : "bg-red-50 border border-red-200 text-red-800"
              }`}
            >
              {isConnected ? (
                <CheckCircle size={16} className="text-green-600" />
              ) : (
                <AlertCircle size={16} className="text-red-600" />
              )}

              {!isConnected && (
                <button
                  onClick={fetchBills}
                  disabled={isRefreshing}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-70"
                >
                  <RefreshCw
                    size={16}
                    className={isRefreshing ? "animate-spin" : ""}
                    style={
                      isRefreshing
                        ? { animation: "spin 1s linear infinite" }
                        : {}
                    }
                  />
                  {isRefreshing ? "Refreshing..." : "Refresh"}
                </button>
              )}
            </div>
          )}

          {renderBankManagement()}
          {showBankForm && renderBankForm()}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {isConnected !== null && (
          <div
            className={`mb-4 px-4 py-2 rounded-lg flex items-center gap-2 $`}
          >
            {!isConnected && (
              <button
                onClick={checkConnection}
                className="ml-auto text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 flex items-center gap-1"
              >
                <RefreshCw size={12} />
                Retry
              </button>
            )}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <FileText className="text-indigo-600" />
                Bill Management System
              </h1>
              <p className="text-gray-600 mt-2">
                Create and manage your purchase orders efficiently
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowBankManagement(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Settings size={16} />
                Bank Management
              </button>
              <button
                onClick={() => {
                  setEditingCompany(null);
                  setCompanyFormData({
                    name: "",
                    registeredOffice: "",
                    principalPlaceOfBusiness: "",
                    gstin: "",
                    pan: "",
                    iec: "",
                    emails: [
                      "sales@ingredientz.co",
                      "procurement@ingredientz.co",
                    ],
                    isActive: true,
                  });
                  setShowCompanyManagement(true);
                }}
                className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2"
              >
                <Building2 size={16} />
                Company Management
              </button>
              <button
                onClick={() => {
                  if (isConnected) {
                    resetForm();
                    setShowForm(true);
                  } else {
                    Swal.fire({
                      icon: "error",
                      title: "Server Not Connected",
                      text: "Cannot create bill: Server not connected",
                      confirmButtonColor: "#4F46E5",
                    });
                  }
                }}
                disabled={!isConnected}
                className={`px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                  isConnected
                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                    : "bg-gray-400 text-gray-200 cursor-not-allowed"
                }`}
              >
                <Plus size={20} />
                Create New
              </button>
            </div>
          </div>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-800">
                    {`Create New ${
                      billTypeOptions.find((opt) => opt.value === formData.type)
                        ?.label || "Purchase Order"
                    }`}
                  </h2>
                  <button
                    onClick={() => setShowForm(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <Hash size={16} className="text-indigo-600" />
                      Sr Number (Auto-generated)
                    </label>
                    <input
                      type="text"
                      name="poNo"
                      value={formData.poNo}
                      readOnly
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                      placeholder="Auto-generated Sr number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <Calendar size={16} className="text-indigo-600" />
                      Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Document Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="type"
                      value={formData.type}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    >
                      <option value="">Select Type</option>
                      {billTypeOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Each type has its own numbering sequence
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Company <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="companyId"
                    value={formData.companyId}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  >
                    {companies.map((c) => (
                      <option key={c._id || c.id} value={c._id || c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {companies.length === 0 && (
                    <p className="text-sm text-amber-600 mt-1">
                      No companies found. Add companies in backend or refresh.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Banknote size={16} className="text-indigo-600" />
                    Bank Account
                  </label>
                  <select
                    name="bankId"
                    value={formData.bankId}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  >
                    <option value="">Select Bank Account (Optional)</option>
                    {bankDetails
                      .filter((bank) => bank.isActive !== false)
                      .map((bank) => (
                        <option key={bank._id} value={bank._id}>
                          {bank.bankName} - {bank.accountName} (****
                          {bank.accountNumber.slice(-4)})
                        </option>
                      ))}
                  </select>
                  {bankDetails.length === 0 && (
                    <p className="text-sm text-amber-600 mt-1">
                      No bank accounts available. Go to Bank Management to add
                      accounts.
                    </p>
                  )}
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <User size={18} className="text-indigo-600" />
                    {formData.type === "purchase_order"
                      ? "Supplier Information"
                      : "Customer Information"}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        {formData.type === "purchase_order"
                          ? "Supplier Name"
                          : "Customer Name"}{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="customerName"
                        value={formData.customerName}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        placeholder={
                          formData.type === "purchase_order"
                            ? "Enter supplier name"
                            : "Enter customer name"
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        {formData.type === "purchase_order"
                          ? "Supplier GSTIN"
                          : "Customer GSTIN"}
                      </label>
                      <input
                        type="text"
                        name="customerGSTIN"
                        value={formData.customerGSTIN}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        placeholder={
                          formData.type === "purchase_order"
                            ? "Enter supplier GSTIN (optional)"
                            : "Enter customer GSTIN (optional)"
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        {formData.type === "purchase_order"
                          ? "Supplier Address"
                          : "Customer Address"}{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        name="customerAddress"
                        value={formData.customerAddress}
                        onChange={handleInputChange}
                        required
                        rows="3"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        placeholder={
                          formData.type === "purchase_order"
                            ? "Enter supplier address"
                            : "Enter customer address"
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Delivery Address <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        name="deliveryAddress"
                        value={formData.deliveryAddress}
                        onChange={handleInputChange}
                        required
                        rows="3"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        placeholder="Enter delivery address"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4"></div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                      <Package size={18} className="text-indigo-600" />
                      Items
                    </h3>
                    <button
                      type="button"
                      onClick={addItem}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                    >
                      <Plus size={16} />
                      Add Item
                    </button>
                  </div>

                  {formData.items.map((item, index) => (
                    <div
                      key={index}
                      className="bg-gray-50 p-4 rounded-lg border"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "description",
                                e.target.value
                              )
                            }
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Item description"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            HSN
                          </label>
                          <input
                            type="text"
                            value={item.hsn}
                            onChange={(e) =>
                              handleItemChange(index, "hsn", e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="HSN code"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Qty <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "quantity",
                                e.target.value
                              )
                            }
                            min="0"
                            step="0.01"
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Unit
                          </label>
                          <select
                            value={item.unit}
                            onChange={(e) =>
                              handleItemChange(index, "unit", e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          >
                            {unitOptions.map((unit) => (
                              <option key={unit} value={unit}>
                                {unit.toUpperCase()}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Currency
                          </label>
                          <select
                            value={item.currency}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "currency",
                                e.target.value
                              )
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          >
                            {currencyOptions.map((currency) => (
                              <option key={currency} value={currency}>
                                {currency}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Unit Price (per kg){" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "unitPrice",
                                e.target.value
                              )
                            }
                            min="0"
                            step="0.01"
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="0.00"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {item.quantity && item.unitPrice && item.unit ? (
                              <>
                                Amount: {item.currency}{" "}
                                {(
                                  parseFloat(item.quantity || 0) *
                                  (unitToKgConversion[item.unit] || 1) *
                                  parseFloat(item.unitPrice || 0)
                                ).toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </>
                            ) : (
                              "Price per kg"
                            )}
                          </p>
                        </div>
                      </div>
                      {formData.items.length > 1 && (
                        <div className="mt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded transition-colors flex items-center gap-1"
                          >
                            <Trash2 size={16} />
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Tax Percentage (%)
                      </label>
                      <div className="flex items-center gap-2">
                        <Percent size={16} className="text-indigo-600" />
                        <input
                          type="number"
                          name="taxPercent"
                          value={formData.taxPercent}
                          onChange={handleInputChange}
                          min="0"
                          max="100"
                          step="0.01"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Payment Terms
                      </label>
                      <input
                        type="text"
                        name="paymentTerms"
                        value={formData.paymentTerms}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Delivery Terms
                      </label>
                      <input
                        type="text"
                        name="deliveryTerms"
                        value={formData.deliveryTerms}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Mode of Dispatch
                      </label>
                      <input
                        type="text"
                        name="modeOfDispatch"
                        value={formData.modeOfDispatch}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="e.g., By Road, By Air, Courier"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Billing Instructions
                      </label>
                      <textarea
                        name="billingInstructions"
                        value={formData.billingInstructions}
                        onChange={handleInputChange}
                        rows="2"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Special billing instructions"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Remarks
                      </label>
                      <textarea
                        name="remarks"
                        value={formData.remarks}
                        onChange={handleInputChange}
                        rows="2"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Additional remarks"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Terms & Conditions
                      </label>
                      <textarea
                        value={formData.termsAndConditions.join("\n")}
                        onChange={(e) =>
                          handleArrayInputChange(
                            "termsAndConditions",
                            e.target.value
                          )
                        }
                        rows="4"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Enter terms and conditions, each on a new line"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Enter each term on a new line
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <Image size={16} className="text-indigo-600" />
                        Company Logo
                      </label>
                      <input
                        type="file"
                        name="image"
                        accept="image/*"
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Upload JPG, PNG, or GIF (max 5MB)
                      </p>
                      {imagePreview && (
                        <div className="mt-2">
                          <img
                            src={imagePreview}
                            alt="Logo preview"
                            className="w-20 h-20 object-contain border border-gray-300 rounded"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bill Preview */}
                  <div className="bg-indigo-50 p-6 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <DollarSign size={18} className="text-indigo-600" />
                      Bill Preview ({formData.currency})
                    </h4>
                    <div className="space-y-4">
                      <div className="text-sm text-gray-600">
                        <p className="mb-2">Items: {formData.items.length}</p>
                        <p className="mb-2">Tax Rate: {formData.taxPercent}%</p>

                        {/* Calculate and display totals */}
                        {(() => {
                          const subtotal = formData.items.reduce(
                            (sum, item) => {
                              const qty = parseFloat(item.quantity) || 0;
                              const price = parseFloat(item.unitPrice) || 0;
                              const unit = item.unit || "kg";

                              const qtyInKg =
                                qty * (unitToKgConversion[unit] || 1);

                              return sum + qtyInKg * price;
                            },
                            0
                          );

                          const taxAmount =
                            (subtotal *
                              (parseFloat(formData.taxPercent) || 0)) /
                            100;
                          const grandTotal = subtotal + taxAmount;

                          return (
                            <div className="bg-white p-4 rounded-lg border border-indigo-200 space-y-2">
                              <div className="text-xs text-gray-500 mb-2 italic">
                                * Unit price is per kg. Amounts calculated after
                                unit conversion.
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Subtotal:</span>
                                <span className="font-medium">
                                  {formData.currency}{" "}
                                  {subtotal.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">
                                  Tax ({formData.taxPercent}%):
                                </span>
                                <span className="font-medium">
                                  {formData.currency}{" "}
                                  {taxAmount.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </span>
                              </div>
                              <div className="flex justify-between text-base font-bold pt-2 border-t border-indigo-200">
                                <span className="text-gray-800">
                                  Grand Total:
                                </span>
                                <span className="text-indigo-600">
                                  {formData.currency}{" "}
                                  {grandTotal.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {formData.bankId && (
                        <div className="bg-blue-50 p-3 rounded border border-blue-200">
                          <p className="text-sm text-blue-800 font-medium">
                            Selected Bank Account:
                          </p>
                          <p className="text-xs text-blue-600">
                            {
                              bankDetails.find(
                                (bank) => bank._id === formData.bankId
                              )?.bankName
                            }{" "}
                            -{" "}
                            {
                              bankDetails.find(
                                (bank) => bank._id === formData.bankId
                              )?.accountName
                            }
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex gap-4 pt-6 border-t">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !isConnected}
                    className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Creating...
                      </>
                    ) : (
                      <>
                        <Save size={20} />
                        {`Create ${
                          billTypeOptions.find(
                            (opt) => opt.value === formData.type
                          )?.label || "Purchase Order"
                        }`}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Bank Form Modal */}
        {showBankForm && renderBankForm()}

        {/* Bills List */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    Recent Bills
                  </h2>
                  <p className="text-gray-600">Manage your created bills</p>
                </div>
                <button
                  onClick={fetchBills}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  <RefreshCw
                    size={16}
                    style={
                      isRefreshing
                        ? {
                            animation: "spin 1s linear infinite",
                            transformOrigin: "center",
                          }
                        : {}
                    }
                  />
                  Refresh
                </button>
              </div>

              {/* Search and Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-1">
                  <div className="relative">
                    <Search
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                      size={18}
                    />
                    <input
                      type="text"
                      placeholder="Search by Sr, customer, or GSTIN..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="date-desc">Latest First</option>

                    <option value="amount-desc">Highest Amount</option>
                    <option value="amount-asc">Lowest Amount</option>
                  </select>
                </div>
                <div>
                  <select
                    value={filterCurrency}
                    onChange={(e) => setFilterCurrency(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">All Currencies</option>
                    {availableCurrencies.map((currency) => (
                      <option key={currency} value={currency}>
                        {currency}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">All Types</option>
                    {billTypeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Results count */}
              <div className="text-sm text-gray-600">
                Showing {paginatedBills.length} of{" "}
                {filteredAndSortedBills.length} bills
                {bills.length !== filteredAndSortedBills.length && (
                  <span className="ml-2 text-indigo-600">
                    (filtered from {bills.length} total)
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">
                    Sr Number
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">
                    Customer
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">
                    Amount
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">
                    Currency
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedBills.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      <FileText
                        size={48}
                        className="mx-auto mb-4 text-gray-400"
                      />
                      <p>
                        {bills.length === 0
                          ? "No bills created yet. Create your first bill to get started!"
                          : "No bills match your search criteria."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedBills.map(
                    (bill) => (
                      console.log("bill", bill),
                      (
                        <tr
                          key={bill._id || bill.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                {bill.poNo}
                              </span>
                              <span
                                className={`text-xs px-2 py-1 rounded ${getBillTypeColor(
                                  bill.type
                                )}`}
                              >
                                {getBillTypeLabel(bill.type)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="font-medium text-gray-900">
                                {bill.customerName}
                              </div>
                              {bill.customerGSTIN && (
                                <div className="text-sm text-gray-500">
                                  GSTIN: {bill.customerGSTIN}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                            {bill.date
                              ? new Date(bill.date).toLocaleDateString()
                              : "N/A"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-medium text-green-600">
                              {(Number(bill.grandTotal) || 0).toFixed(2)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm bg-indigo-100 text-indigo-800 px-2 py-1 rounded">
                              {bill.currency || "INR"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() =>
                                  downloadPdf(bill._id || bill.id, bill.poNo)
                                }
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded shadow-sm hover:bg-indigo-700 transition-all duration-150"
                                aria-label="Download PDF"
                              >
                                <Download size={18} className="mr-1" />
                                PDF
                              </button>
                              <button
                                onClick={() =>
                                  handleDeleteBill(bill._id || bill.id)
                                }
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-red-500 rounded shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 transition-all duration-150 border border-transparent"
                                aria-label="Delete bill"
                              >
                                <Trash2 size={18} className="mr-1" />
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    )
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  First
                </button>
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>
                <div className="flex gap-1">
                  {[...Array(totalPages)].map((_, i) => {
                    const page = i + 1;
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-2 border rounded-lg transition-colors ${
                            currentPage === page
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {page}
                        </button>
                      );
                    } else if (
                      page === currentPage - 2 ||
                      page === currentPage + 2
                    ) {
                      return (
                        <span key={page} className="px-2 py-2 text-gray-400">
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}
                </div>
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  Last
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BillManagementApp;

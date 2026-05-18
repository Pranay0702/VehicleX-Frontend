const API_BASE_URL = 'http://localhost:5272/api';

const api = {
    async fetch(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;

        const defaultHeaders = {
            'Content-Type': 'application/json',
        };

        const config = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers,
            },
        };

        try {
            const response = await fetch(url, config);
            const result = await response.json();

            if (!response.ok) {
                // If the backend returns a structured error, use its message
                const errorMessage = result.message || `API Error: ${response.statusText}`;
                const errors = result.errors || [];
                throw { message: errorMessage, errors };
            }

            return result;
        } catch (error) {
            console.error('API Call Failed:', error);
            if (error.message) throw error;
            throw { message: 'Network error or server unreachable.', errors: [] };
        }
    },

    vendors: {
        getAll: () => api.fetch('/vendors'),
        getById: (id) => api.fetch(`/vendors/${id}`),
        create: (data) => api.fetch('/vendors', { method: 'POST', body: JSON.stringify(data) }),
        update: (id, data) => api.fetch(`/vendors/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        delete: (id) => api.fetch(`/vendors/${id}`, { method: 'DELETE' }),
    },

    parts: {
        getAll: () => api.fetch('/parts'),
        getById: (id) => api.fetch(`/parts/${id}`),
        create: (data) => api.fetch('/parts', { method: 'POST', body: JSON.stringify(data) }),
        update: (id, data) => api.fetch(`/parts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        delete: (id) => api.fetch(`/parts/${id}`, { method: 'DELETE' }),
    },

    purchases: {
        getAll: () => api.fetch('/purchases'),
        getById: (id) => api.fetch(`/purchases/${id}`),
        create: (data) => api.fetch('/purchases', { method: 'POST', body: JSON.stringify(data) }),
    },

    customers: {
        getAll: () => api.fetch('/customers'),
        getById: (id) => api.fetch(`/customers/${id}`),
        search: (term) => api.fetch(`/customers/search?searchTerm=${encodeURIComponent(term)}`),
        getDetailsForStaff: (id) => api.fetch(`/customers/staff/${id}/details-history`),
    },

    appointments: {
        getAll: () => api.fetch('/appointments'),
        getByCustomer: (customerId) => api.fetch(`/appointments/customer/${customerId}`),
        book: (data) => api.fetch('/appointments', { method: 'POST', body: JSON.stringify(data) }),
    },

    unavailablePartRequests: {
        getAll: () => api.fetch('/unavailable-part-requests'),
        getByCustomer: (customerId) => api.fetch(`/unavailable-part-requests/customer/${customerId}`),
        create: (data) => api.fetch('/unavailable-part-requests', { method: 'POST', body: JSON.stringify(data) }),
    },

    serviceReviews: {
        getAll: () => api.fetch('/service-reviews'),
        getByCustomer: (customerId) => api.fetch(`/service-reviews/customer/${customerId}`),
        create: (data) => api.fetch('/service-reviews', { method: 'POST', body: JSON.stringify(data) }),
    },

    customerHistory: {
        getAll: (customerId) => api.fetch(`/customers/${customerId}/history`),
        getPurchases: (customerId) => api.fetch(`/customers/${customerId}/history/purchases`),
        getServices: (customerId) => api.fetch(`/customers/${customerId}/history/services`),
    },

    staff: {
        getAll: () => api.fetch('/staff'),
        getById: (id) => api.fetch(`/staff/${id}`),
        create: (data) => api.fetch('/staff', { method: 'POST', body: JSON.stringify(data) }),
        update: (id, data) => api.fetch(`/staff/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        updateRole: (id, data) => api.fetch(`/staff/${id}/role`, { method: 'PATCH', body: JSON.stringify(data) }),
        delete: (id) => api.fetch(`/staff/${id}`, { method: 'DELETE' }),
    },

    sales: {
        getCustomers: () => api.fetch('/sales/customers'),
        getParts: () => api.fetch('/sales/parts'),
        createInvoice: (data) => api.fetch('/sales/invoices', { method: 'POST', body: JSON.stringify(data) }),
        getInvoiceById: (id) => api.fetch(`/sales/invoices/${id}`),
    }
};

const salesPricing = {
    loyaltyThreshold: 5000,
    loyaltyRate: 0.10,
    defaultTaxRate: 0.13,

    computeTotals(subtotal, taxRate = 0.13) {
        const safeSubtotal = Number(subtotal) || 0;
        const safeTaxRate = Number(taxRate) || 0;
        const discount = safeSubtotal > this.loyaltyThreshold
            ? Number((safeSubtotal * this.loyaltyRate).toFixed(2))
            : 0;
        const discountedSubtotal = safeSubtotal - discount;
        const tax = Number((discountedSubtotal * safeTaxRate).toFixed(2));
        const grandTotal = Math.max(0, Number((discountedSubtotal + tax).toFixed(2)));

        return {
            subtotal: safeSubtotal,
            discount,
            discountedSubtotal,
            tax,
            grandTotal,
            isLoyaltyApplied: discount > 0
        };
    }
};

// UI Helpers
const ui = {
    // Refresh all Lucide icons on the page
    refreshIcons() {
        if (window.lucide) {
            window.lucide.createIcons();
        }
    },

    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const iconName = type === 'success' ? 'check-circle' : 'alert-circle';
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px">
                <i data-lucide="${iconName}" style="width: 20px; height: 20px"></i>
                <span>${message}</span>
            </div>
        `;

        container.appendChild(toast);
        this.refreshIcons();

        setTimeout(() => {
            toast.style.transform = 'translateX(120%)';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 400);
        }, 4000);
    },

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.style.display = 'flex';
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.style.transition = 'opacity 0.3s ease';
            modal.style.opacity = '1';
        }, 10);
    },

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);

        const forms = document.querySelectorAll(`#${modalId} form`);
        forms.forEach(f => f.reset());
    }
};

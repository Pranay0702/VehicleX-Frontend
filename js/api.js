const API_BASE_URL = 'http://localhost:5272/api';

const STAFF_ROLES = ['Admin', 'Manager', 'SalesStaff', 'InventoryStaff', 'SupportStaff'];

const api = {
    async fetch(endpoint, options = {}, authMode = 'auto') {
        const url = `${API_BASE_URL}${endpoint}`;

        const defaultHeaders = {
            'Content-Type': 'application/json',
        };

        const customerToken = localStorage.getItem('customerToken');
        const staffToken = localStorage.getItem('staffToken');

        const useCustomer = authMode === 'customer'
            || (authMode === 'auto' && (endpoint.startsWith('/portal') || endpoint.includes('/customers/my-history') || endpoint === '/customers/profile' || endpoint.startsWith('/customers/vehicles')));
        const useStaff = authMode === 'staff' || (authMode === 'auto' && !useCustomer && staffToken);

        if (useStaff && staffToken) {
            defaultHeaders['Authorization'] = `Bearer ${staffToken}`;
        } else if (useCustomer && customerToken) {
            defaultHeaders['Authorization'] = `Bearer ${customerToken}`;
        } else if (authMode === 'auto') {
            if (staffToken) defaultHeaders['Authorization'] = `Bearer ${staffToken}`;
            else if (customerToken) defaultHeaders['Authorization'] = `Bearer ${customerToken}`;
        }

        const config = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers,
            },
        };

        try {
            const response = await fetch(url, config);

            let result = null;
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                result = await response.json();
            } else {
                const text = await response.text();
                if (text) {
                    try {
                        result = JSON.parse(text);
                    } catch {
                        result = { message: text };
                    }
                } else {
                    result = {};
                }
            }

            if (!response.ok) {
                const errorMessage = result.message || `API Error: ${response.statusText}`;
                const errors = result.errors || [];
                throw { message: errorMessage, errors, status: response.status };
            }

            return result;
        } catch (error) {
            console.error('API Call Failed:', error);
            if (error.message) throw error;
            throw { message: 'Network error or server unreachable.', errors: [] };
        }
    },

    vendors: {
        getAll: () => api.fetch('/vendors', {}, 'staff'),
        getById: (id) => api.fetch(`/vendors/${id}`, {}, 'staff'),
        create: (data) => api.fetch('/vendors', { method: 'POST', body: JSON.stringify(data) }, 'staff'),
        update: (id, data) => api.fetch(`/vendors/${id}`, { method: 'PUT', body: JSON.stringify(data) }, 'staff'),
        delete: (id) => api.fetch(`/vendors/${id}`, { method: 'DELETE' }, 'staff'),
    },

    parts: {
        getAll: () => api.fetch('/parts', {}, 'auto'),
        getById: (id) => api.fetch(`/parts/${id}`, {}, 'staff'),
        create: (data) => api.fetch('/parts', { method: 'POST', body: JSON.stringify(data) }, 'staff'),
        update: (id, data) => api.fetch(`/parts/${id}`, { method: 'PUT', body: JSON.stringify(data) }, 'staff'),
        delete: (id) => api.fetch(`/parts/${id}`, { method: 'DELETE' }, 'staff'),
    },

    restocks: {
        getAll: () => api.fetch('/restocks', {}, 'staff'),
        getById: (id) => api.fetch(`/restocks/${id}`, {}, 'staff'),
        create: (data) => api.fetch('/restocks', { method: 'POST', body: JSON.stringify(data) }, 'staff'),
    },

    customers: {
        getAll: () => api.fetch('/customers', {}, 'staff'),
        getById: (id) => api.fetch(`/customers/${id}`, {}, 'staff'),
        search: (term) => api.fetch(`/customers/search?searchTerm=${encodeURIComponent(term)}`, {}, 'staff'),
        getDetailsForStaff: (id) => api.fetch(`/customers/staff/${id}/details-history`, {}, 'staff'),
        staffRegister: (data) => api.fetch('/customers/staff-register', { method: 'POST', body: JSON.stringify(data) }, 'staff'),
        selfRegister: (data) => api.fetch('/customers/self-register', { method: 'POST', body: JSON.stringify(data) }),
        login: (data) => api.fetch('/customers/login', { method: 'POST', body: JSON.stringify(data) }),
        getProfile: () => api.fetch('/customers/profile', {}, 'customer'),
        updateProfile: (data) => api.fetch('/customers/profile', { method: 'PUT', body: JSON.stringify(data) }, 'customer'),
        getVehicles: () => api.fetch('/customers/vehicles', {}, 'customer'),
        addVehicle: (data) => api.fetch('/customers/vehicles', { method: 'POST', body: JSON.stringify(data) }, 'customer'),
        updateVehicle: (vehicleId, data) => api.fetch(`/customers/vehicles/${vehicleId}`, { method: 'PUT', body: JSON.stringify(data) }, 'customer'),
        deleteVehicle: (vehicleId) => api.fetch(`/customers/vehicles/${vehicleId}`, { method: 'DELETE' }, 'customer'),
        logout: () => localStorage.removeItem('customerToken'),
    },

    portal: {
        getAppointments: () => api.fetch('/portal/appointments', {}, 'customer'),
        bookAppointment: (data) => api.fetch('/portal/appointments', { method: 'POST', body: JSON.stringify(data) }, 'customer'),
        requestPart: (data) => api.fetch('/portal/part-requests', { method: 'POST', body: JSON.stringify(data) }, 'customer'),
        submitReview: (data) => api.fetch('/portal/reviews', { method: 'POST', body: JSON.stringify(data) }, 'customer'),
        purchaseParts: (data) => api.fetch('/portal/purchase-parts', { method: 'POST', body: JSON.stringify(data) }, 'customer'),
        getHistory: () => api.fetch('/portal/history', {}, 'customer'),
        getPartRequests: (customerId) => api.fetch(`/unavailable-part-requests/customer/${customerId}`, {}, 'customer'),
        getPurchases: () => api.fetch('/customers/my-history/purchases', {}, 'customer'),
        getServices: () => api.fetch('/customers/my-history/services', {}, 'customer'),
    },

    appointments: {
        getAll: () => api.fetch('/appointments', {}, 'staff'),
        getByCustomer: (customerId) => api.fetch(`/appointments/customer/${customerId}`, {}, 'staff'),
        book: (data) => api.fetch('/appointments', { method: 'POST', body: JSON.stringify(data) }, 'staff'),
        updateStatus: (id, status) => api.fetch(`/appointments/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }, 'staff'),
    },

    unavailablePartRequests: {
        getAll: () => api.fetch('/unavailable-part-requests', {}, 'staff'),
        getByCustomer: (customerId) => api.fetch(`/unavailable-part-requests/customer/${customerId}`, {}, 'staff'),
        create: (data) => api.fetch('/unavailable-part-requests', { method: 'POST', body: JSON.stringify(data) }, 'staff'),
        updateStatus: (id, status) => api.fetch(`/unavailable-part-requests/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }, 'staff'),
    },

    serviceReviews: {
        getAll: () => api.fetch('/service-reviews', {}, 'staff'),
        getByCustomer: (customerId) => api.fetch(`/service-reviews/customer/${customerId}`, {}, 'staff'),
        create: (data) => api.fetch('/service-reviews', { method: 'POST', body: JSON.stringify(data) }, 'staff'),
    },

    customerHistory: {
        getAll: (customerId) => api.fetch(`/customers/${customerId}/history`, {}, 'staff'),
        getPurchases: (customerId) => api.fetch(`/customers/${customerId}/history/purchases`, {}, 'staff'),
        getServices: (customerId) => api.fetch(`/customers/${customerId}/history/services`, {}, 'staff'),
    },

    staff: {
        getAll: () => api.fetch('/staff', {}, 'staff'),
        getById: (id) => api.fetch(`/staff/${id}`, {}, 'staff'),
        create: (data) => api.fetch('/staff', { method: 'POST', body: JSON.stringify(data) }, 'staff'),
        update: (id, data) => api.fetch(`/staff/${id}`, { method: 'PUT', body: JSON.stringify(data) }, 'staff'),
        updateRole: (id, data) => api.fetch(`/staff/${id}/role`, { method: 'PATCH', body: JSON.stringify(data) }, 'staff'),
        delete: (id) => api.fetch(`/staff/${id}`, { method: 'DELETE' }, 'staff'),
        login: (data) => api.fetch('/staff/login', { method: 'POST', body: JSON.stringify(data) }),
        logout: () => localStorage.removeItem('staffToken'),
        getLoggedInUser: () => {
            const token = localStorage.getItem('staffToken');
            if (!token) return null;
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                return {
                    id: payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'],
                    name: payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'],
                    email: payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'],
                    role: payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']
                };
            } catch (e) {
                return null;
            }
        },
        isAdmin: () => api.staff.getLoggedInUser()?.role === 'Admin',
    },

    auth: {
        getDashboardForRole: (role) => role === 'Admin' ? 'admin-dashboard.html' : 'staff-dashboard.html',

        redirectToDashboard: () => {
            const user = api.staff.getLoggedInUser();
            if (!user) {
                window.location.href = 'login.html?type=staff';
                return;
            }
            window.location.href = api.auth.getDashboardForRole(user.role);
        },

        requireAdmin: () => {
            if (!localStorage.getItem('staffToken')) {
                window.location.href = 'login.html?type=staff';
                return false;
            }
            const user = api.staff.getLoggedInUser();
            if (user?.role !== 'Admin') {
                window.location.href = 'staff-dashboard.html';
                return false;
            }
            return true;
        },

        requireStaff: () => {
            if (!localStorage.getItem('staffToken')) {
                window.location.href = 'login.html?type=staff';
                return false;
            }
            const user = api.staff.getLoggedInUser();
            if (!user || !STAFF_ROLES.includes(user.role)) {
                window.location.href = 'login.html?type=staff';
                return false;
            }
            return true;
        },

        requireCustomer: () => {
            if (!localStorage.getItem('customerToken')) {
                window.location.href = 'login.html?type=customer';
                return false;
            }
            return true;
        },
    },

    sales: {
        getCustomers: () => api.fetch('/sales/customers', {}, 'staff'),
        getParts: () => api.fetch('/sales/parts', {}, 'staff'),
        createInvoice: (data) => api.fetch('/sales/invoices', { method: 'POST', body: JSON.stringify(data) }, 'staff'),
        getInvoiceById: (id) => api.fetch(`/sales/invoices/${id}`, {}, 'staff'),
    },

    reports: {
        getDaily: (date) => api.fetch(`/reports/financial/daily?date=${date}`, {}, 'staff'),
        getMonthly: (year, month) => api.fetch(`/reports/financial/monthly?year=${year}&month=${month}`, {}, 'staff'),
        getYearly: (year) => api.fetch(`/reports/financial/yearly?year=${year}`, {}, 'staff'),
        getAnalysis: (from, to) => api.fetch(`/reports/financial/analysis?from=${from || ''}&to=${to || ''}`, {}, 'staff'),
        getCustomerIntelligence: () => api.fetch('/reports/customers/intelligence', {}, 'staff'),
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

const ui = {
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
    },

    getStaffNavLinks(isAdmin) {
        const links = [
            { href: isAdmin ? 'admin-dashboard.html' : 'staff-dashboard.html', icon: 'layout-dashboard', label: 'Dashboard' },
            { href: 'parts.html', icon: 'package', label: 'Parts' },
            { href: 'customers.html', icon: 'user', label: 'Customers' },
            { href: 'customer-services.html', icon: 'calendar-check', label: 'Customer Services' },
        ];
        if (!isAdmin) {
            links.splice(2, 0, { href: 'sales.html', icon: 'receipt', label: 'Sales' });
        }
        if (isAdmin) {
            links.splice(1, 0,
                { href: 'vendors.html', icon: 'users', label: 'Vendors' },
                { href: 'purchases.html', icon: 'shopping-cart', label: 'Restock' },
                { href: 'staff.html', icon: 'user-cog', label: 'Staff' }
            );
        }
        return links;
    },

    setupStaffSidebar(activePage) {
        const staff = api.staff.getLoggedInUser();
        if (!staff) return;

        const isAdmin = staff.role === 'Admin';
        const nav = document.querySelector('.nav-links');
        if (nav) {
            nav.innerHTML = this.getStaffNavLinks(isAdmin).map(link => `
                <li><a href="${link.href}" class="${activePage === link.href ? 'active' : ''}">
                    <i data-lucide="${link.icon}"></i> ${link.label}
                </a></li>
            `).join('');
        }

        const footer = document.querySelector('.sidebar-footer');
        if (footer) {
            const initials = (staff.name || 'ST').substring(0, 2).toUpperCase();
            footer.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 32px; height: 32px; background: var(--bg-hover); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 700; color: #fff;">
                            ${initials}
                        </div>
                        <div>
                            <div style="font-size: 0.75rem; font-weight: 600; color: #fff;">${staff.name}</div>
                            <div style="font-size: 0.6rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">
                                ${staff.role}
                            </div>
                        </div>
                    </div>
                    <button id="sidebar-logout-btn" title="Logout" style="background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px;">
                        <i data-lucide="log-out" style="width: 16px; height: 16px;"></i>
                    </button>
                </div>
            `;

            document.getElementById('sidebar-logout-btn')?.addEventListener('click', () => {
                api.staff.logout();
                window.location.href = '../index.html';
            });
        }

        this.refreshIcons();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Intercept logo links to point to the active dashboard if user is logged in
    const logoLink = document.querySelector('.sidebar-header a, .logo-container a, a:has(.sidebar-logo), a:has(.logo-img)');
    if (logoLink) {
        const staff = api.staff.getLoggedInUser();
        const customerToken = localStorage.getItem('customerToken');
        if (staff) {
            logoLink.href = staff.role === 'Admin' ? 'admin-dashboard.html' : 'staff-dashboard.html';
        } else if (customerToken) {
            logoLink.href = 'customer-dashboard.html';
        }
    }

    // Intercept any "Exit Portal" links to go to the customer profile instead of landing page
    const exitLinks = document.querySelectorAll('a[href="../index.html"]');
    exitLinks.forEach(link => {
        if (link.textContent.toLowerCase().includes('exit')) {
            const customerToken = localStorage.getItem('customerToken');
            if (customerToken) {
                link.href = 'customer-dashboard.html';
            }
        }
    });
});


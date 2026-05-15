const DEFAULT_API_BASE = "http://localhost:62972/api";

const state = {
  apiBaseUrl: localStorage.getItem("vehiclexApiBaseUrl") || DEFAULT_API_BASE,
  customerId: localStorage.getItem("vehiclexCustomerId") || "",
  customers: [],
  appointments: [],
  partRequests: [],
  reviews: [],
  history: { purchaseHistory: [], serviceHistory: [] }
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

document.addEventListener("DOMContentLoaded", () => {
  $("#apiBaseUrl").value = state.apiBaseUrl;
  bindNavigation();
  bindHistoryTabs();
  bindForms();
  bindButtons();
  loadCustomers();
});

function bindNavigation() {
  $$(".nav-link").forEach((button) => {
    button.addEventListener("click", () => {
      $$(".nav-link").forEach((item) => item.classList.remove("active"));
      $$(".view").forEach((view) => view.classList.remove("active"));
      button.classList.add("active");
      $(`#${button.dataset.target}`).classList.add("active");
    });
  });
}

function bindHistoryTabs() {
  $$(".tab").forEach((button) => {
    button.addEventListener("click", () => {
      $$(".tab").forEach((tab) => tab.classList.remove("active"));
      $$(".history-panel").forEach((panel) => panel.classList.remove("active"));
      button.classList.add("active");
      $(`#${button.dataset.historyTab === "purchases" ? "purchaseHistory" : "serviceHistory"}`).classList.add("active");
    });
  });
}

function bindButtons() {
  $("#saveApiUrl").addEventListener("click", () => {
    state.apiBaseUrl = $("#apiBaseUrl").value.trim().replace(/\/$/, "") || DEFAULT_API_BASE;
    localStorage.setItem("vehiclexApiBaseUrl", state.apiBaseUrl);
    showMessage("API URL saved.", "success");
  });

  $("#customerSelect").addEventListener("change", (event) => {
    state.customerId = event.target.value;
    localStorage.setItem("vehiclexCustomerId", state.customerId);
    updateSelectedCustomer();
    fillVehicleForms();
    refreshCustomerData();
  });

  $("#refreshCustomers").addEventListener("click", loadCustomers);
  $("#refreshDashboard").addEventListener("click", refreshCustomerData);
  $("#refreshAppointments").addEventListener("click", loadAppointments);
  $("#refreshPartRequests").addEventListener("click", loadPartRequests);
  $("#refreshReviews").addEventListener("click", loadReviews);
  $("#refreshHistory").addEventListener("click", loadHistory);
}

function bindForms() {
  $("#customerForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = formValues(event.currentTarget);

    try {
      const customer = await apiFetch("/customers", {
        method: "POST",
        body: payload
      });

      showMessage("Customer registered successfully.", "success");
      event.currentTarget.reset();
      state.customerId = String(customer.id);
      localStorage.setItem("vehiclexCustomerId", state.customerId);
      await loadCustomers();
    } catch (error) {
      showMessage(error.message, "error");
    }
  });

  $("#vehicleForm").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!requireCustomer()) return;

    const vehicle = formValues(event.currentTarget);
    localStorage.setItem(vehicleStorageKey(), JSON.stringify(vehicle));
    fillVehicleForms();
    showMessage("Vehicle details saved for the selected customer.", "success");
  });

  $("#appointmentForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!requireCustomer()) return;

    const values = formValues(event.currentTarget);
    const payload = {
      customerId: Number(state.customerId),
      appointmentDateUtc: new Date(values.appointmentDateUtc).toISOString(),
      serviceType: values.serviceType,
      vehicleMake: emptyToNull(values.vehicleMake),
      vehicleModel: emptyToNull(values.vehicleModel),
      vehicleRegistrationNumber: emptyToNull(values.vehicleRegistrationNumber),
      notes: emptyToNull(values.notes)
    };

    try {
      await apiFetch("/appointments", { method: "POST", body: payload });
      showMessage("Appointment booked successfully.", "success");
      event.currentTarget.reset();
      fillVehicleForms();
      await loadAppointments();
      await loadHistory();
    } catch (error) {
      showMessage(error.message, "error");
    }
  });

  $("#partRequestForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!requireCustomer()) return;

    const values = formValues(event.currentTarget);
    const payload = {
      customerId: Number(state.customerId),
      partName: values.partName,
      partNumber: emptyToNull(values.partNumber),
      vehicleMake: emptyToNull(values.vehicleMake),
      vehicleModel: emptyToNull(values.vehicleModel),
      quantity: Number(values.quantity),
      notes: emptyToNull(values.notes)
    };

    try {
      await apiFetch("/unavailable-part-requests", { method: "POST", body: payload });
      showMessage("Unavailable part request submitted.", "success");
      event.currentTarget.reset();
      fillVehicleForms();
      await loadPartRequests();
    } catch (error) {
      showMessage(error.message, "error");
    }
  });

  $("#reviewForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!requireCustomer()) return;

    const values = formValues(event.currentTarget);
    const payload = {
      customerId: Number(state.customerId),
      appointmentId: values.appointmentId ? Number(values.appointmentId) : null,
      rating: values.rating,
      comment: values.comment
    };

    try {
      await apiFetch("/service-reviews", { method: "POST", body: payload });
      showMessage("Service review submitted.", "success");
      event.currentTarget.reset();
      await loadReviews();
      await loadHistory();
    } catch (error) {
      showMessage(error.message, "error");
    }
  });
}

async function apiFetch(path, options = {}) {
  const requestOptions = {
    method: options.method || "GET",
    headers: { "Content-Type": "application/json" }
  };

  if (options.body !== undefined) {
    requestOptions.body = JSON.stringify(options.body);
  }

  let response;
  try {
    response = await fetch(`${state.apiBaseUrl}${path}`, requestOptions);
  } catch {
    throw new Error("Unable to reach the API. Check that the backend is running and the API URL is correct.");
  }

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : null;

  if (!response.ok || payload?.success === false) {
    throw new Error(formatApiError(payload, response.status));
  }

  return payload?.data ?? payload;
}

function formatApiError(payload, status) {
  if (!payload) {
    return `Request failed with status ${status}.`;
  }

  const messages = [];
  if (payload.message) messages.push(payload.message);

  if (payload.errors && typeof payload.errors === "object") {
    Object.entries(payload.errors).forEach(([field, fieldErrors]) => {
      const joined = Array.isArray(fieldErrors) ? fieldErrors.join(", ") : String(fieldErrors);
      messages.push(`${field}: ${joined}`);
    });
  }

  return messages.join(" ") || `Request failed with status ${status}.`;
}

async function loadCustomers() {
  try {
    state.customers = await apiFetch("/customers");
    renderCustomerSelect();
    updateSelectedCustomer();
    fillVehicleForms();
    await refreshCustomerData();
  } catch (error) {
    showMessage(error.message, "error");
    renderCustomerSelect();
  }
}

async function refreshCustomerData() {
  await Promise.allSettled([
    loadAppointments(),
    loadPartRequests(),
    loadReviews(),
    loadHistory()
  ]);
  renderDashboard();
}

async function loadAppointments() {
  if (!state.customerId) {
    state.appointments = [];
    renderAppointments();
    renderDashboard();
    return;
  }

  try {
    state.appointments = await apiFetch(`/appointments/customer/${state.customerId}`);
    renderAppointments();
    renderDashboard();
  } catch (error) {
    state.appointments = [];
    renderAppointments(error.message);
    showMessage(error.message, "error");
  }
}

async function loadPartRequests() {
  if (!state.customerId) {
    state.partRequests = [];
    renderPartRequests();
    renderDashboard();
    return;
  }

  try {
    state.partRequests = await apiFetch(`/unavailable-part-requests/customer/${state.customerId}`);
    renderPartRequests();
    renderDashboard();
  } catch (error) {
    state.partRequests = [];
    renderPartRequests(error.message);
    showMessage(error.message, "error");
  }
}

async function loadReviews() {
  if (!state.customerId) {
    state.reviews = [];
    renderReviews();
    renderDashboard();
    return;
  }

  try {
    state.reviews = await apiFetch(`/service-reviews/customer/${state.customerId}`);
    renderReviews();
    renderDashboard();
  } catch (error) {
    state.reviews = [];
    renderReviews(error.message);
    showMessage(error.message, "error");
  }
}

async function loadHistory() {
  if (!state.customerId) {
    state.history = { purchaseHistory: [], serviceHistory: [] };
    renderHistory();
    return;
  }

  try {
    state.history = await apiFetch(`/customers/${state.customerId}/history`);
    renderHistory();
  } catch (error) {
    state.history = { purchaseHistory: [], serviceHistory: [] };
    renderHistory(error.message);
    showMessage(error.message, "error");
  }
}

function renderCustomerSelect() {
  const select = $("#customerSelect");
  select.innerHTML = `<option value="">No customer selected</option>${state.customers
    .map((customer) => `<option value="${customer.id}">${escapeHtml(customer.fullName || `${customer.firstName} ${customer.lastName}`)} - ${escapeHtml(customer.email)}</option>`)
    .join("")}`;

  if (state.customerId && state.customers.some((customer) => String(customer.id) === String(state.customerId))) {
    select.value = state.customerId;
  } else {
    state.customerId = "";
    localStorage.removeItem("vehiclexCustomerId");
  }
}

function updateSelectedCustomer() {
  const customer = selectedCustomer();
  $("#customerStatus").textContent = customer
    ? `${customer.fullName} selected. ID: ${customer.id}`
    : "Register or select a customer to manage their services.";
}

function renderDashboard() {
  $("#statCustomers").textContent = state.customers.length;
  $("#statAppointments").textContent = state.appointments.length;
  $("#statPartRequests").textContent = state.partRequests.length;
  $("#statReviews").textContent = state.reviews.length;
}

function renderAppointments(errorMessage = "") {
  const list = $("#appointmentList");
  if (errorMessage) {
    list.innerHTML = emptyState(errorMessage);
    return;
  }

  if (!state.customerId) {
    list.innerHTML = emptyState("Select a customer to view appointments.");
    return;
  }

  list.innerHTML = state.appointments.length
    ? state.appointments.map((item) => recordCard({
        title: item.serviceType,
        badge: item.statusName || item.status,
        meta: [
          `Appointment ID: ${item.id}`,
          formatDate(item.appointmentDateUtc),
          vehicleText(item)
        ],
        body: item.notes,
        editAction: `prefillAppointment(${item.id})`,
        deleteAction: `unsupportedAction("Appointment delete")`
      })).join("")
    : emptyState("No appointments have been booked yet.");
}

function renderPartRequests(errorMessage = "") {
  const list = $("#partRequestList");
  if (errorMessage) {
    list.innerHTML = emptyState(errorMessage);
    return;
  }

  if (!state.customerId) {
    list.innerHTML = emptyState("Select a customer to view unavailable part requests.");
    return;
  }

  list.innerHTML = state.partRequests.length
    ? state.partRequests.map((item) => recordCard({
        title: item.partName,
        badge: item.statusName || item.status,
        meta: [
          `Request ID: ${item.id}`,
          `Qty: ${item.quantity}`,
          item.partNumber ? `Part No: ${item.partNumber}` : "",
          vehicleText(item)
        ],
        body: item.notes,
        editAction: `prefillPartRequest(${item.id})`,
        deleteAction: `unsupportedAction("Part request delete")`
      })).join("")
    : emptyState("No unavailable part requests have been submitted yet.");
}

function renderReviews(errorMessage = "") {
  const list = $("#reviewList");
  if (errorMessage) {
    list.innerHTML = emptyState(errorMessage);
    return;
  }

  if (!state.customerId) {
    list.innerHTML = emptyState("Select a customer to view service reviews.");
    return;
  }

  list.innerHTML = state.reviews.length
    ? state.reviews.map((item) => recordCard({
        title: `Rating: ${item.ratingName || item.rating}`,
        badge: item.appointmentId ? `Appointment ${item.appointmentId}` : "General review",
        meta: [
          `Review ID: ${item.id}`,
          formatDate(item.createdAtUtc)
        ],
        body: item.comment,
        editAction: `prefillReview(${item.id})`,
        deleteAction: `unsupportedAction("Review delete")`
      })).join("")
    : emptyState("No service reviews have been submitted yet.");
}

function renderHistory(errorMessage = "") {
  const purchases = state.history.purchaseHistory || [];
  const services = state.history.serviceHistory || [];

  if (errorMessage) {
    $("#purchaseHistory").innerHTML = emptyState(errorMessage);
    $("#serviceHistory").innerHTML = emptyState(errorMessage);
    return;
  }

  if (!state.customerId) {
    $("#purchaseHistory").innerHTML = emptyState("Select a customer to view purchase history.");
    $("#serviceHistory").innerHTML = emptyState("Select a customer to view service history.");
    return;
  }

  $("#purchaseHistory").innerHTML = purchases.length
    ? purchases.map((purchase) => recordCard({
        title: `Invoice ${purchase.invoiceNumber}`,
        badge: purchase.statusName || purchase.status,
        meta: [
          `Purchase ID: ${purchase.id}`,
          formatDate(purchase.purchaseDateUtc),
          money(purchase.totalAmount)
        ],
        body: purchase.items?.length ? purchase.items.map((item) => `${escapeHtml(item.partName)} x ${item.quantity} (${money(item.lineTotal)})`).join("<br>") : "No line items recorded.",
        bodyHtml: Boolean(purchase.items?.length)
      })).join("")
    : emptyState("No purchase history is available for this customer.");

  $("#serviceHistory").innerHTML = services.length
    ? services.map((service) => recordCard({
        title: service.serviceType,
        badge: service.appointmentStatusName || service.appointmentStatus,
        meta: [
          `Appointment ID: ${service.appointmentId}`,
          formatDate(service.appointmentDateUtc),
          vehicleText(service)
        ],
        body: service.review ? `Review: ${service.review.comment}` : "No review recorded for this service."
      })).join("")
    : emptyState("No service history is available for this customer.");
}

function recordCard({ title, badge, meta = [], body = "", bodyHtml = false, editAction = "", deleteAction = "" }) {
  const actions = editAction || deleteAction
    ? `<div class="record-actions">
        ${editAction ? `<button type="button" class="secondary" onclick="${editAction}">Update</button>` : ""}
        ${deleteAction ? `<button type="button" class="danger" onclick="${deleteAction}">Delete</button>` : ""}
      </div>`
    : "";

  return `<article class="record-card">
    <div class="record-header">
      <div>
        <h3>${escapeHtml(title || "Untitled record")}</h3>
        <div class="record-meta">${meta.filter(Boolean).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
      </div>
      ${badge ? `<span class="badge">${escapeHtml(badge)}</span>` : ""}
    </div>
    ${body ? `<p>${bodyHtml ? body : escapeHtml(body)}</p>` : ""}
    ${actions}
  </article>`;
}

function emptyState(message) {
  return `<div class="empty-state">${escapeHtml(message)}</div>`;
}

function fillVehicleForms() {
  const vehicle = getVehicleDetails();
  ["appointmentForm", "partRequestForm", "vehicleForm"].forEach((formId) => {
    const form = $(`#${formId}`);
    if (!form) return;
    setIfExists(form, "vehicleMake", vehicle.vehicleMake);
    setIfExists(form, "vehicleModel", vehicle.vehicleModel);
    setIfExists(form, "vehicleRegistrationNumber", vehicle.vehicleRegistrationNumber);
    setIfExists(form, "preferredService", vehicle.preferredService);
    setIfExists(form, "serviceType", vehicle.preferredService);
  });
}

function prefillAppointment(id) {
  const appointment = state.appointments.find((item) => item.id === id);
  if (!appointment) return;

  const form = $("#appointmentForm");
  setIfExists(form, "appointmentDateUtc", toDateTimeLocal(appointment.appointmentDateUtc));
  setIfExists(form, "serviceType", appointment.serviceType);
  setIfExists(form, "vehicleMake", appointment.vehicleMake);
  setIfExists(form, "vehicleModel", appointment.vehicleModel);
  setIfExists(form, "vehicleRegistrationNumber", appointment.vehicleRegistrationNumber);
  setIfExists(form, "notes", appointment.notes);
  showMessage("Appointment details loaded into the form. The backend does not expose an update endpoint for saving edits yet.", "error");
}

function prefillPartRequest(id) {
  const request = state.partRequests.find((item) => item.id === id);
  if (!request) return;

  const form = $("#partRequestForm");
  setIfExists(form, "partName", request.partName);
  setIfExists(form, "partNumber", request.partNumber);
  setIfExists(form, "vehicleMake", request.vehicleMake);
  setIfExists(form, "vehicleModel", request.vehicleModel);
  setIfExists(form, "quantity", request.quantity);
  setIfExists(form, "notes", request.notes);
  showMessage("Part request details loaded into the form. The backend does not expose an update endpoint for saving edits yet.", "error");
}

function prefillReview(id) {
  const review = state.reviews.find((item) => item.id === id);
  if (!review) return;

  const form = $("#reviewForm");
  setIfExists(form, "appointmentId", review.appointmentId);
  setIfExists(form, "rating", review.ratingName || review.rating);
  setIfExists(form, "comment", review.comment);
  showMessage("Review details loaded into the form. The backend does not expose an update endpoint for saving edits yet.", "error");
}

function unsupportedAction(actionName) {
  showMessage(`${actionName} is not available because the backend currently has no matching endpoint.`, "error");
}

function requireCustomer() {
  if (state.customerId) return true;
  showMessage("Please register or select a customer first.", "error");
  return false;
}

function selectedCustomer() {
  return state.customers.find((customer) => String(customer.id) === String(state.customerId));
}

function getVehicleDetails() {
  if (!state.customerId) return {};
  try {
    return JSON.parse(localStorage.getItem(vehicleStorageKey()) || "{}");
  } catch {
    return {};
  }
}

function vehicleStorageKey() {
  return `vehiclexVehicle:${state.customerId}`;
}

function formValues(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function setIfExists(form, name, value) {
  const field = form.elements[name];
  if (field) field.value = value ?? "";
}

function emptyToNull(value) {
  const trimmed = typeof value === "string" ? value.trim() : value;
  return trimmed ? trimmed : null;
}

function vehicleText(item) {
  const parts = [item.vehicleMake, item.vehicleModel, item.vehicleRegistrationNumber].filter(Boolean);
  return parts.length ? parts.join(" ") : "Vehicle not specified";
}

function formatDate(value) {
  if (!value) return "Date not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function toDateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    style: "currency",
    currency: "USD"
  });
}

function showMessage(message, type) {
  const area = $("#messageArea");
  area.textContent = message;
  area.className = `message ${type}`;
  clearTimeout(showMessage.timer);
  showMessage.timer = setTimeout(() => {
    area.classList.add("hidden");
  }, 7000);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

window.prefillAppointment = prefillAppointment;
window.prefillPartRequest = prefillPartRequest;
window.prefillReview = prefillReview;
window.unsupportedAction = unsupportedAction;

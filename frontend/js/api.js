const API_BASE = "https://civic-connect-j3s9.onrender.com/api";

async function api(url, options = {}) {
    const token = localStorage.getItem("token");

    const headers = {
        ...(options.headers || {})
    };

    if (!(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
    }

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(API_BASE + url, {
        ...options,
        headers
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Request Failed");
    }

    return data;
}

const AuthAPI = {

    // ---------------- REGISTER ----------------
    async register(user) {
        return await api("/auth/register", {
            method: "POST",
            body: JSON.stringify(user)
        });
    },

    // ---------------- LOGIN ----------------
    async login(email, password, role = "citizen") {

        const res = await api("/auth/login", {
            method: "POST",
            body: JSON.stringify({
                email,
                password,
                role
            })
        });

        localStorage.setItem("token", res.token);
        localStorage.setItem("user", JSON.stringify(res.user));

        return res.user;
    },

    // ---------------- FORGOT PASSWORD ----------------
    async forgotPassword(email) {
        return await api("/auth/forgot-password", {
            method: "POST",
            body: JSON.stringify({
                email
            })
        });
    },

    // ---------------- RESET PASSWORD ----------------
    async resetPassword(email, otp, newPassword) {
        return await api("/auth/reset-password", {
            method: "POST",
            body: JSON.stringify({
                email,
                otp,
                newPassword
            })
        });
    },

    // ---------------- CURRENT USER ----------------
    async me() {
        return await api("/auth/me");
    },

    // ---------------- UPDATE PROFILE ----------------
    async updateProfile(data) {
        return await api("/auth/profile", {
            method: "PUT",
            body: JSON.stringify(data)
        });
    },

    // ---------------- LOGOUT ----------------
    logout() {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
    },

    // ---------------- GET CURRENT USER ----------------
    currentUser() {
        return JSON.parse(localStorage.getItem("user"));
    }

};

// ======================================================

const ComplaintAPI = {

    async create(formData) {

        return await api("/complaints", {
            method: "POST",
            body: formData
        });

    },

    async getAll() {

        return await api("/complaints");

    }

};

// ======================================================

const AdminAPI = {

    async dashboard() {
        return await api("/admin/dashboard");
    },

    async complaints() {
        return await api("/admin/complaints");
    }

};

// ======================================================

const NotificationAPI = {

    async getAll() {
        return await api("/notifications");
    }

};
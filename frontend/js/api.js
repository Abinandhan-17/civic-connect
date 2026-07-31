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

    async register(user) {
        return await api("/auth/register", {
            method: "POST",
            body: JSON.stringify(user)
        });
    },

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

    logout() {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
    },

    currentUser() {
        return JSON.parse(localStorage.getItem("user"));
    }
};

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
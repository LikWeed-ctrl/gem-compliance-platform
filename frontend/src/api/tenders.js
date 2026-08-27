import api from "./client";

export const getTenders = () => api.get("/tenders").then((res) => res.data);

export const getTenderById = (id) => api.get(`/tenders/${id}`).then((res) => res.data);

export const createTender = (data) => api.post("/tenders", data).then((res) => res.data);
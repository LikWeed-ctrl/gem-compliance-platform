import api from "./client";

export const getBiddersByTender = (tenderId) =>
  api.get(`/bidders/tender/${tenderId}`).then((res) => res.data);

export const getBidderById = (id) =>
  api.get(`/bidders/${id}`).then((res) => res.data);

export const createBidder = (data) =>
  api.post("/bidders", data).then((res) => res.data);

export const runChecksForBidder = (id) =>
  api.post(`/bidders/${id}/run-checks`).then((res) => res.data);

export const getComplianceChecks = (bidderId) =>
  api.get(`/bidders/${bidderId}/checks`).then((res) => res.data);

export const recordOfficerDecision = (id, decisionData) =>
  api.post(`/bidders/${id}/decision`, decisionData).then((res) => res.data);

export const getAuditTrail = (bidderId) =>
  api.get(`/bidders/${bidderId}/audit-trail`).then((res) => res.data);

export const extractDocumentPreview = (formData) =>
  api
    .post("/documents/extract-preview", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((res) => res.data);

export const createBidderWithDocuments = (payload) =>
  api.post("/bidders/with-documents", payload).then((res) => res.data);
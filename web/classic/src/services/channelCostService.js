import { API } from '../helpers';

export async function getChannelCosts() {
  const res = await API.get('/api/channel-cost/');
  return res.data;
}

export async function getChannelCost(id) {
  const res = await API.get(`/api/channel-cost/${id}`);
  return res.data;
}

export async function createChannelCost(data) {
  const res = await API.post('/api/channel-cost/', data);
  return res.data;
}

export async function updateChannelCost(id, data) {
  const res = await API.put(`/api/channel-cost/${id}`, data);
  return res.data;
}

export async function deleteChannelCost(id) {
  const res = await API.delete(`/api/channel-cost/${id}`);
  return res.data;
}

export async function getChannelModelPrices(params = {}) {
  const res = await API.get('/api/channel-pricing/', { params });
  return res.data;
}

export async function syncChannelPrices(data) {
  const res = await API.post('/api/channel-pricing/sync', data);
  return res.data;
}

export async function batchUpdateChannelPricing(data) {
  const res = await API.post('/api/channel-pricing/batch', data);
  return res.data;
}

export async function checkPriceAnomalies() {
  const res = await API.get('/api/channel-pricing/anomalies');
  return res.data;
}

export async function getPricingStats() {
  const res = await API.get('/api/channel-pricing/stats');
  return res.data;
}

export async function getPriceSyncLogs(params = {}) {
  const res = await API.get('/api/channel-pricing/logs', { params });
  return res.data;
}

// Pricing alert APIs
export async function getPriceAlertLogs(params = {}) {
  const res = await API.get('/api/pricing-alerts/', { params });
  return res.data;
}

export async function getUnreadPriceAlertCount() {
  const res = await API.get('/api/pricing-alerts/unread-count');
  return res.data;
}

export async function acknowledgePriceAlert(id) {
  const res = await API.post(`/api/pricing-alerts/${id}/acknowledge`);
  return res.data;
}

export async function acknowledgeAllPriceAlerts() {
  const res = await API.post('/api/pricing-alerts/acknowledge-all');
  return res.data;
}
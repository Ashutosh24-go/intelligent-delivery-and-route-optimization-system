import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { getWarehouses, addWarehouse, removeWarehouse } from './warehouseStore.js';
import { getOrders, addOrder, clearOrders, getOrderCount } from './orderStore.js';
import { optimizeRoute } from './optimiser.js';
import { ensureGraphForCity } from './graph.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// In-memory route state for batch delivery
let currentRouteState = null;

// Reverse geocode helper using Nominatim with fallback
app.get('/api/reverseGeocode', async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng parameters are required' });
  }

  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${latNum}&lon=${lngNum}&format=json&addressdetails=1`;
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'leaflet-order-manager/1.0' },
      timeout: 3000
    });

    if (response.data) {
      const addr = response.data.address || {};
      const city = addr.city || addr.town || addr.municipality || addr.state_district || addr.state || 'Delhi';
      const addressLine = response.data.display_name
        ? response.data.display_name.split(',').slice(0, 3).join(', ')
        : `Location near ${city} (${latNum.toFixed(4)}, ${lngNum.toFixed(4)})`;

      return res.json({
        address: addressLine,
        city: city,
        lat: latNum,
        lng: lngNum
      });
    }
  } catch (err) {
    // Graceful fallback if external geocoding service is unavailable
  }

  res.json({
    address: `Point (${latNum.toFixed(4)}, ${lngNum.toFixed(4)})`,
    city: 'Delhi',
    lat: latNum,
    lng: lngNum
  });
});

// WAREHOUSE ENDPOINTS
app.get('/api/warehouses', (req, res) => {
  const list = getWarehouses();
  res.json(list);
});

app.post('/api/warehouses', (req, res) => {
  const { lat, lng, address, city } = req.body;
  if (lat === undefined || lng === undefined) {
    return res.status(400).json({ error: 'lat and lng are required' });
  }

  const warehouse = addWarehouse({ lat, lng, address, city });
  res.status(201).json(warehouse);
});

app.delete('/api/warehouses/:id', (req, res) => {
  const { id } = req.params;
  const removed = removeWarehouse(id);
  if (removed) {
    res.json({ success: true, message: `Warehouse ${id} removed` });
  } else {
    res.status(404).json({ error: 'Warehouse not found' });
  }
});

// ORDER ENDPOINTS
app.get('/api/orders', (req, res) => {
  res.json(getOrders());
});

app.post('/api/orders', async (req, res) => {
  const { productName, urgency, lat, lng, address, city } = req.body;
  if (lat === undefined || lng === undefined) {
    return res.status(400).json({ error: 'lat and lng are required' });
  }

  const order = addOrder({ productName, urgency, lat, lng, address, city });

  // When first order is placed in a city, trigger OSM road graph download/caching
  if (getOrderCount() === 1 || city) {
    ensureGraphForCity(order.city, order.lat, order.lng).catch(err => {
      console.warn('Background graph prefetch warning:', err.message);
    });
  }

  res.status(201).json(order);
});

// ROUTE OPTIMISATION ENDPOINTS

// 1. Place all orders using 2-opt
app.post('/api/placeAllOrders', async (req, res) => {
  try {
    const orders = getOrders();
    const warehouses = getWarehouses();

    if (orders.length === 0) {
      return res.status(400).json({ error: 'No orders have been added yet.' });
    }
    if (warehouses.length === 0) {
      return res.status(400).json({ error: 'No storehouses available in the city.' });
    }

    const routeResult = await optimizeRoute(orders, warehouses, '2opt');
    currentRouteState = routeResult;
    res.json(routeResult);
  } catch (err) {
    console.error('Error placing orders:', err);
    res.status(500).json({ error: err.message });
  }
});

// 2. Optimise route using Held-Karp (max 14 orders)
app.post('/api/optimiseHeldKarp', async (req, res) => {
  try {
    const orders = getOrders();
    const warehouses = getWarehouses();

    if (orders.length > 14) {
      return res.status(400).json({ error: 'Held-Karp algorithm is restricted to 14 orders or fewer.' });
    }
    if (orders.length === 0 || warehouses.length === 0) {
      return res.status(400).json({ error: 'Orders and warehouses required.' });
    }

    const hkResult = await optimizeRoute(orders, warehouses, 'heldKarp');

    const previousProfit = currentRouteState ? currentRouteState.profit : 0;
    const isImproved = hkResult.profit > previousProfit + 1e-4;
    const isWarehouseChanged = currentRouteState && currentRouteState.assignedWarehouse.id !== hkResult.assignedWarehouse.id;

    if (isImproved) {
      currentRouteState = hkResult;
    }

    res.json({
      improved: isImproved,
      warehouseChanged: isWarehouseChanged,
      route: isImproved ? hkResult : currentRouteState,
      message: isImproved
        ? (isWarehouseChanged ? `Warehouse updated to Warehouse ${hkResult.assignedWarehouse.id}` : 'Delivery optimised')
        : 'No optimisation was possible'
    });
  } catch (err) {
    console.error('Error in Held-Karp optimization:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. Finish batch delivery
app.post('/api/finishBatch', (req, res) => {
  clearOrders();
  currentRouteState = null;
  res.json({ success: true, message: 'Batch delivery finished. Orders cleared.' });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

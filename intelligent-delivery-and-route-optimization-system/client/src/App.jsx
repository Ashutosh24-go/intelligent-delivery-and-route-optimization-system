import React, { useState, useEffect } from 'react';
import LeftSidebar from './components/LeftSidebar.jsx';
import RightSidebar from './components/RightSidebar.jsx';
import MapView from './components/MapView.jsx';
import * as api from './utils/api.js';

export default function App() {
  const [activeTab, setActiveTab] = useState('storehouses');
  const [warehouses, setWarehouses] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);

  const [routeData, setRouteData] = useState(null);
  const [selectedOrderDelivery, setSelectedOrderDelivery] = useState(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [heldKarpResult, setHeldKarpResult] = useState(null);

  // Load initial warehouses and orders from backend
  useEffect(() => {
    loadWarehouses();
    loadOrders();
  }, []);

  const loadWarehouses = async () => {
    try {
      const data = await api.getWarehouses();
      setWarehouses(data);
    } catch (err) {
      console.error('Failed to load warehouses:', err);
    }
  };

  const loadOrders = async () => {
    try {
      const data = await api.getOrders();
      setOrders(data);
    } catch (err) {
      console.error('Failed to load orders:', err);
    }
  };

  // Map Click Handler
  const handleMapClick = async ({ lat, lng }) => {
    // If route is actively displayed and orders are locked, clicking map doesn't add new orders until batch finish
    if (routeData && activeTab === 'orders') return;

    // Check if clicked near an existing warehouse
    const existing = warehouses.find(
      w => Math.abs(w.lat - lat) < 0.0015 && Math.abs(w.lng - lng) < 0.0015
    );

    if (existing) {
      setSelectedLocation({
        lat: existing.lat,
        lng: existing.lng,
        address: existing.address,
        city: existing.city,
        existingWarehouseId: existing.id
      });
      return;
    }

    // Reverse geocode clicked location
    const geocoded = await api.reverseGeocode(lat, lng);
    setSelectedLocation({
      lat,
      lng,
      address: geocoded.address,
      city: geocoded.city,
      existingWarehouseId: null
    });
  };

  // Warehouse selection from marker click
  const handleSelectWarehouse = (wh) => {
    setSelectedLocation({
      lat: wh.lat,
      lng: wh.lng,
      address: wh.address,
      city: wh.city,
      existingWarehouseId: wh.id
    });
  };

  // Add Warehouse
  const handleAddWarehouse = async (loc) => {
    try {
      const newWh = await api.addWarehouse(loc);
      await loadWarehouses();
      setSelectedLocation(prev => ({
        ...prev,
        existingWarehouseId: newWh.id
      }));
    } catch (err) {
      console.error('Error adding warehouse:', err);
    }
  };

  // Remove Warehouse
  const handleRemoveWarehouse = async (id) => {
    try {
      await api.removeWarehouse(id);
      await loadWarehouses();
      setSelectedLocation(null);
    } catch (err) {
      console.error('Error removing warehouse:', err);
    }
  };

  // Add Order
  const handleAddOrder = async (orderData) => {
    try {
      await api.addOrder(orderData);
      await loadOrders();
      setSelectedLocation(null);
    } catch (err) {
      console.error('Error adding order:', err);
    }
  };

  // Place All Orders (2-Opt)
  const handlePlaceAllOrders = async () => {
    if (orders.length === 0 || warehouses.length === 0) return;
    setIsOptimizing(true);
    try {
      const res = await api.placeAllOrders();

      // Ensure full road snapping alignment via OpenStreetMap routing
      if (res.assignedWarehouse && res.tour && res.tour.length > 0) {
        const stops = [res.assignedWarehouse, ...res.tour, res.assignedWarehouse];
        const roadPath = await api.fetchRoadGeometry(stops);
        if (roadPath && roadPath.length > 1) {
          res.routePolyline = roadPath;
        }
      }

      setRouteData(res);
      setHeldKarpResult(null);
      setSelectedLocation(null);

      // Default select first order in delivery sequence
      if (res.tour && res.tour.length > 0 && res.orderDetails) {
        setSelectedOrderDelivery(res.orderDetails[res.tour[0].id]);
      }
    } catch (err) {
      alert(`Error placing orders: ${err.message}`);
    } finally {
      setIsOptimizing(false);
    }
  };

  // Run Held-Karp exact optimisation
  const handleOptimiseHeldKarp = async () => {
    if (orders.length > 14) return;
    setIsOptimizing(true);
    try {
      const res = await api.optimiseHeldKarp();
      setHeldKarpResult({
        improved: res.improved,
        warehouseChanged: res.warehouseChanged,
        message: res.message
      });

      if (res.improved && res.route) {
        if (res.route.assignedWarehouse && res.route.tour && res.route.tour.length > 0) {
          const stops = [res.route.assignedWarehouse, ...res.route.tour, res.route.assignedWarehouse];
          const roadPath = await api.fetchRoadGeometry(stops);
          if (roadPath && roadPath.length > 1) {
            res.route.routePolyline = roadPath;
          }
        }

        setRouteData(res.route);
        if (selectedOrderDelivery && res.route.orderDetails) {
          setSelectedOrderDelivery(res.route.orderDetails[selectedOrderDelivery.orderId]);
        }
      }
    } catch (err) {
      alert(`Error during Held-Karp optimisation: ${err.message}`);
    } finally {
      setIsOptimizing(false);
    }
  };

  // Finish Batch Delivery
  const handleFinishBatch = async () => {
    try {
      await api.finishBatch();
      setOrders([]);
      setRouteData(null);
      setSelectedOrderDelivery(null);
      setHeldKarpResult(null);
      setSelectedLocation(null);
    } catch (err) {
      console.error('Error finishing batch:', err);
    }
  };

  // Order selection (from marker click or sequence list)
  const handleSelectOrder = (order) => {
    if (routeData && routeData.orderDetails) {
      setSelectedOrderDelivery(routeData.orderDetails[order.id] || null);
    } else {
      setSelectedOrderDelivery({
        orderId: order.id,
        productName: order.productName,
        distanceKm: 'N/A',
        timeUntilDelivery: 'Pending batch placement'
      });
    }
  };

  return (
    <div className="app-layout">
      {/* 1. Left Sidebar */}
      <LeftSidebar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setSelectedLocation(null);
        }}
      />

      {/* 2. Middle Map */}
      <MapView
        warehouses={warehouses}
        orders={orders}
        activeTab={activeTab}
        selectedLocation={selectedLocation}
        onMapClick={handleMapClick}
        onSelectWarehouse={handleSelectWarehouse}
        onSelectOrder={handleSelectOrder}
        routeData={routeData}
        selectedOrderDelivery={selectedOrderDelivery}
      />

      {/* 3. Right Sidebar */}
      <RightSidebar
        activeTab={activeTab}
        warehouses={warehouses}
        orders={orders}
        selectedLocation={selectedLocation}
        onAddWarehouse={handleAddWarehouse}
        onRemoveWarehouse={handleRemoveWarehouse}
        onAddOrder={handleAddOrder}
        onPlaceAllOrders={handlePlaceAllOrders}
        onOptimiseHeldKarp={handleOptimiseHeldKarp}
        onFinishBatch={handleFinishBatch}
        routeData={routeData}
        selectedOrderDelivery={selectedOrderDelivery}
        onSelectOrder={handleSelectOrder}
        isOptimizing={isOptimizing}
        heldKarpResult={heldKarpResult}
      />
    </div>
  );
}

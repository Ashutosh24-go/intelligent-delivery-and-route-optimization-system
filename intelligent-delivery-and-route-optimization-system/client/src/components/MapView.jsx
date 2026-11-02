import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

export default function MapView({
  warehouses,
  orders,
  activeTab,
  selectedLocation,
  onMapClick,
  onSelectWarehouse,
  onSelectOrder,
  routeData,
  selectedOrderDelivery
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const warehouseMarkersRef = useRef(new Map());
  const orderMarkersRef = useRef(new Map());
  const routePolylineRef = useRef(null);
  const selectedWarehouseCircleRef = useRef(null);
  const tempMarkerRef = useRef(null);

  // Initialize Leaflet map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Default to zoomed Delhi, India
    const map = L.map(mapContainerRef.current, {
      center: [28.6139, 77.2090],
      zoom: 12,
      zoomControl: true,
      dragging: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map);

    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      onMapClick({ lat, lng });
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update temporary click marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tempMarkerRef.current) {
      tempMarkerRef.current.remove();
      tempMarkerRef.current = null;
    }

    if (selectedLocation && !selectedLocation.existingWarehouseId) {
      const tempIcon = L.divIcon({
        className: 'custom-temp-marker',
        html: `<div class="temp-pulse-dot"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      tempMarkerRef.current = L.marker([selectedLocation.lat, selectedLocation.lng], { icon: tempIcon }).addTo(map);
    }
  }, [selectedLocation]);

  // Update warehouse markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear removed warehouses
    const currentWhIds = new Set(warehouses.map(w => String(w.id)));
    for (const [id, marker] of warehouseMarkersRef.current.entries()) {
      if (!currentWhIds.has(id)) {
        marker.remove();
        warehouseMarkersRef.current.delete(id);
      }
    }

    // Add or update warehouses
    warehouses.forEach(wh => {
      const idStr = String(wh.id);
      if (!warehouseMarkersRef.current.has(idStr)) {
        // Dark blue square with depth / 3D styling
        const warehouseIcon = L.divIcon({
          className: 'custom-warehouse-marker',
          html: `
            <div class="warehouse-box-3d" title="Warehouse ${wh.id}">
              <div class="warehouse-inner">
                <span class="wh-label">W${wh.id}</span>
              </div>
            </div>
          `,
          iconSize: [34, 34],
          iconAnchor: [17, 17]
        });

        const marker = L.marker([wh.lat, wh.lng], { icon: warehouseIcon }).addTo(map);
        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          onSelectWarehouse(wh);
        });

        warehouseMarkersRef.current.set(idStr, marker);
      }
    });
  }, [warehouses, onSelectWarehouse]);

  // Helper to calculate pin color based on urgency (1 = green, 99 = red)
  function getUrgencyColor(urgency) {
    const ratio = Math.min(1, Math.max(0, (urgency - 1) / 98));
    // Interpolate from green (16, 185, 129) to red (239, 68, 68)
    const r = Math.round(16 + (239 - 16) * ratio);
    const g = Math.round(185 + (68 - 185) * ratio);
    const b = Math.round(129 + (68 - 129) * ratio);
    return `rgb(${r}, ${g}, ${b})`;
  }

  // Update order markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear removed orders
    const currentOrderIds = new Set(orders.map(o => String(o.id)));
    for (const [id, marker] of orderMarkersRef.current.entries()) {
      if (!currentOrderIds.has(id)) {
        marker.remove();
        orderMarkersRef.current.delete(id);
      }
    }

    // Add orders
    orders.forEach(order => {
      const idStr = String(order.id);
      const isSelected = selectedOrderDelivery && selectedOrderDelivery.orderId === order.id;

      if (orderMarkersRef.current.has(idStr)) {
        // Remove to re-render in case selection or urgency changed
        orderMarkersRef.current.get(idStr).remove();
        orderMarkersRef.current.delete(idStr);
      }

      const color = getUrgencyColor(order.urgency);
      const orderIcon = L.divIcon({
        className: 'custom-order-pin',
        html: `
          <div class="order-pin-wrapper ${isSelected ? 'selected' : ''}">
            <svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 0C6.268 0 0 6.268 0 14C0 24.5 14 36 14 36C14 36 28 24.5 28 14C28 6.268 21.732 0 14 0Z" fill="${color}" filter="url(#drop-shadow)"/>
              <circle cx="14" cy="14" r="9" fill="white"/>
              <text x="14" y="18" font-size="11" font-weight="bold" fill="#1e293b" text-anchor="middle">${order.id}</text>
              <defs>
                <filter id="drop-shadow" x="-2" y="0" width="32" height="40" filterUnits="userSpaceOnUse">
                  <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/>
                </filter>
              </defs>
            </svg>
          </div>
        `,
        iconSize: [28, 36],
        iconAnchor: [14, 36]
      });

      const marker = L.marker([order.lat, order.lng], { icon: orderIcon }).addTo(map);
      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectOrder(order);
      });

      orderMarkersRef.current.set(idStr, marker);
    });
  }, [orders, selectedOrderDelivery, onSelectOrder]);

  // Update Route Polyline & Encircled Warehouse
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing polyline
    if (routePolylineRef.current) {
      routePolylineRef.current.remove();
      routePolylineRef.current = null;
    }

    // Clear existing warehouse circle
    if (selectedWarehouseCircleRef.current) {
      selectedWarehouseCircleRef.current.remove();
      selectedWarehouseCircleRef.current = null;
    }

    if (routeData && routeData.routePolyline && routeData.routePolyline.length > 0) {
      // Highlight path in light blue shade
      routePolylineRef.current = L.polyline(routeData.routePolyline, {
        color: '#38BDF8', // Light blue shade
        weight: 6,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      // Fit map bounds to show full route
      try {
        const bounds = routePolylineRef.current.getBounds();
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
      } catch (err) {
        // In case bounds are singular
      }

      // Encircle selected warehouse
      if (routeData.assignedWarehouse) {
        const wh = routeData.assignedWarehouse;
        selectedWarehouseCircleRef.current = L.circle([wh.lat, wh.lng], {
          radius: 700,
          color: '#0284C7',
          weight: 3,
          dashArray: '6, 6',
          fillColor: '#38BDF8',
          fillOpacity: 0.18
        }).addTo(map);
      }
    }
  }, [routeData]);

  return (
    <div className="map-wrapper">
      <div id="map" ref={mapContainerRef} className="map-view" />

      {/* Lower middle note */}
      {(!routeData || activeTab === 'storehouses') && (
        <div className="map-bottom-note">
          <p>add storehouses to start placing orders. Storehouses and orders exist in the same city.</p>
        </div>
      )}
    </div>
  );
}

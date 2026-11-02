const BASE_URL = '/api';

export async function getWarehouses() {
  const res = await fetch(`${BASE_URL}/warehouses`);
  if (!res.ok) throw new Error('Failed to fetch warehouses');
  return res.json();
}

export async function addWarehouse(data) {
  const res = await fetch(`${BASE_URL}/warehouses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to add warehouse');
  return res.json();
}

export async function removeWarehouse(id) {
  const res = await fetch(`${BASE_URL}/warehouses/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to remove warehouse');
  return res.json();
}

export async function getOrders() {
  const res = await fetch(`${BASE_URL}/orders`);
  if (!res.ok) throw new Error('Failed to fetch orders');
  return res.json();
}

export async function addOrder(data) {
  const res = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to add order');
  return res.json();
}

export async function placeAllOrders() {
  const res = await fetch(`${BASE_URL}/placeAllOrders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to place orders');
  }
  return res.json();
}

export async function optimiseHeldKarp() {
  const res = await fetch(`${BASE_URL}/optimiseHeldKarp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Held-Karp optimisation failed');
  }
  return res.json();
}

export async function finishBatch() {
  const res = await fetch(`${BASE_URL}/finishBatch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error('Failed to finish batch delivery');
  return res.json();
}

export async function fetchRoadGeometry(stops) {
  if (!stops || stops.length < 2) return null;
  try {
    const coordString = stops.map(s => `${s.lng},${s.lat}`).join(';');
    const endpoints = [
      `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`,
      `https://routing.openstreetmap.de/routed-car/route/v1/driving/${coordString}?overview=full&geometries=geojson`
    ];

    for (const url of endpoints) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.routes && data.routes.length > 0) {
            return data.routes[0].geometry.coordinates.map(([lon, lat]) => [lat, lon]);
          }
        }
      } catch (e) {
        // try next endpoint
      }
    }
  } catch (err) {
    console.warn('Browser OSRM routing fallback:', err);
  }
  return null;
}

export async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(`${BASE_URL}/reverseGeocode?lat=${lat}&lng=${lng}`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Reverse geocode error:', err);
  }
  return {
    address: `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
    city: 'Delhi',
    lat,
    lng
  };
}

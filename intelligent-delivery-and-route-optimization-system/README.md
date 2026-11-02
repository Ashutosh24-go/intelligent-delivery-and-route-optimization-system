# Intelligent Delivery and Route Optimization System

A clean, professional delivery route optimizer built with **Leaflet** and **OpenStreetMap** (100% open-source, no Google Maps API key required).

---

## Features

1. **OpenStreetMap & Leaflet Integration**:
   - Interactive map centered on Delhi, India by default.
   - Zoom controls (+ / -) and drag-to-pan with left mouse button.
   - Dynamic city OSM road graph fetching on the first order placed in any city.

2. **Storehouses Management**:
   - Add warehouses by clicking anywhere on the map.
   - 3D dark-blue square markers with depth and drop shadow.
   - Reverse-geocoded addresses and auto-incrementing warehouse IDs.
   - Persistent storage in `data/warehouses.json`.
   - Toggle button with colour changes: Blue (`Add warehouse`) / Red (`Remove warehouse`).

3. **Orders & Batch Delivery**:
   - Add orders by clicking on the map (requires at least one warehouse in the city).
   - Order fields: Auto-incrementing Order ID, Product Name, and Urgency slider (1–99).
   - Live urgency display with "not urgent" (green) and "very urgent" (red) indicator tags.
   - Color-coded map pins (green $\to$ yellow $\to$ red) reflecting urgency level.
   - Collapsible order list with timestamps (`hh:mm:ss`).

4. **Algorithmic Routing & Profit Maximization**:
   - **Dijkstra's Algorithm**: Computes road network distances between warehouses and order stops.
   - **2-Opt Optimization**: Maximizes delivery profit:
     $$\text{profit} = \sum_{k} \frac{\text{urgency}[k+1] + (\text{current time} - \text{timestamp}[k+1])}{1 + \text{distance travelled to reach } [k+1]}$$
   - **Optimal Warehouse Assignment**: The warehouse with the highest profit across the city is assigned and encircled on the map.
   - **Light Blue Highlighted Path**: Connects the complete delivery tour on the road network.
   - **Driver Statistics**: Average driver speed 50 km/h, total distance, and ETA range calculated via:
     $$\text{cal\_time} = \left(\frac{\text{distance}}{50}\right) \pm (2\text{ min} \times \text{distance})$$
   - **Interactive Order Details**: Click any order pin on the map or in the list to inspect individual distance and time until delivery.

5. **Held-Karp Exact Route Optimization**:
   - "Optimise route (no. of orders should be less than 15)" button (automatically disabled when orders exceed 14).
   - Evaluates all candidate warehouses using Held-Karp dynamic programming.
   - Reflects improved profit/warehouse updates on the map and sidebar, then disappears.

6. **Finish Batch Delivery**:
   - Clears orders, paths, and results, resetting the UI for the next batch while keeping warehouses intact.

---

## Running the Application

### 1. Install Dependencies
```bash
cd leaflet-order-manager
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
- **Backend API**: Runs on [http://localhost:3001](http://localhost:3001)
- **Frontend App**: Runs on [http://localhost:3000](http://localhost:3000)

Open [http://localhost:3000](http://localhost:3000) in your browser.

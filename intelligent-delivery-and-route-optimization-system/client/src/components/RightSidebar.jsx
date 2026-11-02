import React, { useState } from 'react';
import { FiTruck, FiMapPin, FiClock, FiCheckCircle, FiTrash2, FiPlus, FiAlertCircle } from 'react-icons/fi';

export default function RightSidebar({
  activeTab,
  warehouses,
  orders,
  selectedLocation,
  onAddWarehouse,
  onRemoveWarehouse,
  onAddOrder,
  onPlaceAllOrders,
  onOptimiseHeldKarp,
  onFinishBatch,
  routeData,
  selectedOrderDelivery,
  onSelectOrder,
  isOptimizing,
  heldKarpResult
}) {
  // Order Form State
  const [productName, setProductName] = useState('');
  const [urgency, setUrgency] = useState(1);
  const [toastMessage, setToastMessage] = useState(null);

  // Trigger brief toast message
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleWarehouseAdd = async () => {
    if (!selectedLocation) return;
    await onAddWarehouse(selectedLocation);
    showToast('Warehouse added');
  };

  const handleWarehouseRemove = async (id) => {
    await onRemoveWarehouse(id);
    showToast('Warehouse removed');
  };

  const handleOrderSubmit = (e) => {
    e.preventDefault();
    if (!productName.trim() || !selectedLocation) return;

    onAddOrder({
      productName: productName.trim(),
      urgency: Number(urgency),
      lat: selectedLocation.lat,
      lng: selectedLocation.lng,
      address: selectedLocation.address,
      city: selectedLocation.city
    });

    setProductName('');
    setUrgency(1);
  };

  // Check if current selected location matches an existing warehouse
  const matchedWarehouse = selectedLocation
    ? warehouses.find(
        w =>
          w.id === selectedLocation.existingWarehouseId ||
          (Math.abs(w.lat - selectedLocation.lat) < 0.0005 && Math.abs(w.lng - selectedLocation.lng) < 0.0005)
      )
    : null;

  return (
    <aside className="right-sidebar">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-notification">
          <FiCheckCircle className="toast-icon" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TAB 1: STOREHOUSES */}
      {activeTab === 'storehouses' && (
        <div className="sidebar-content">
          <div className="section-header">
            <h3>Storehouses</h3>
            <span className="badge">{warehouses.length} active</span>
          </div>

          {selectedLocation ? (
            <div className="selection-card">
              <div className="location-line">
                <FiMapPin className="card-icon" />
                <div>
                  <div className="location-label">Selected Spot</div>
                  <div className="location-address">{selectedLocation.address}</div>
                </div>
              </div>

              {matchedWarehouse ? (
                <div className="warehouse-action-box">
                  <div className="wh-info-tag">Warehouse #{matchedWarehouse.id}</div>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => handleWarehouseRemove(matchedWarehouse.id)}
                  >
                    <FiTrash2 /> Remove warehouse
                  </button>
                </div>
              ) : (
                <div className="warehouse-action-box">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleWarehouseAdd}
                  >
                    <FiPlus /> Add warehouse to this location
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-prompt">
              <FiMapPin className="empty-icon" />
              <p>Click any spot on the map to add or manage a storehouse.</p>
            </div>
          )}

          {/* List of existing warehouses */}
          <div className="list-container">
            <h4 className="list-title">Existing Warehouses</h4>
            {warehouses.length === 0 ? (
              <p className="subtext">No warehouses added yet. Click on the map to add one.</p>
            ) : (
              <div className="scrolling-list">
                {warehouses.map(w => (
                  <div key={w.id} className="warehouse-item">
                    <div className="wh-dot" />
                    <div className="wh-details">
                      <strong>Warehouse #{w.id}</strong>
                      <span>{w.address}</span>
                    </div>
                    <button
                      type="button"
                      className="btn-icon-danger"
                      onClick={() => handleWarehouseRemove(w.id)}
                      title="Remove warehouse"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ORDERS */}
      {activeTab === 'orders' && (
        <div className="sidebar-content">
          <div className="section-header">
            <h3>Orders</h3>
            <span className="badge">{orders.length} in batch</span>
          </div>

          {/* If no route calculated yet */}
          {!routeData && (
            <>
              {warehouses.length === 0 ? (
                <div className="empty-prompt warning">
                  <FiAlertCircle className="empty-icon warning" />
                  <p>Please add storehouses first before placing orders. Storehouses and orders exist in the same city.</p>
                </div>
              ) : selectedLocation ? (
                <div className="order-form-container">
                  <form onSubmit={handleOrderSubmit} className="order-form">
                    <div className="location-line">
                      <FiMapPin className="card-icon" />
                      <div className="location-address">{selectedLocation.address}</div>
                    </div>

                    <div className="form-group">
                      <label>Order ID</label>
                      <input
                        type="text"
                        disabled
                        value={`#${orders.length + 1} (Auto)`}
                        className="form-input disabled"
                      />
                    </div>

                    <div className="form-group">
                      <label>Product Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Groceries Package"
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        className="form-input"
                        autoFocus
                      />
                    </div>

                    <div className="form-group">
                      <div className="slider-header">
                        <label>Urgency Level: <strong>{urgency}</strong></label>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="99"
                        value={urgency}
                        onChange={(e) => setUrgency(Number(e.target.value))}
                        className="urgency-slider"
                      />
                      <div className="slider-labels">
                        <span className="tag-green">Not urgent</span>
                        <span className="tag-red">Very urgent</span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={!productName.trim()}
                      className="btn btn-primary btn-block"
                    >
                      Add Order
                    </button>
                  </form>
                </div>
              ) : (
                <div className="empty-prompt">
                  <FiMapPin className="empty-icon" />
                  <p>Click a spot on map to add an order. Orders are placed in batch.</p>
                </div>
              )}

              {/* Scrollable list of added orders */}
              <div className="list-container">
                <h4 className="list-title">Batch Orders ({orders.length})</h4>
                {orders.length === 0 ? (
                  <p className="subtext">No orders added in this batch yet.</p>
                ) : (
                  <div className="scrolling-list">
                    {orders.map(order => (
                      <div
                        key={order.id}
                        className={`order-collapsed-line ${selectedOrderDelivery && selectedOrderDelivery.orderId === order.id ? 'active' : ''}`}
                        onClick={() => onSelectOrder(order)}
                      >
                        <span className="order-badge">#{order.id}</span>
                        <span className="order-name" title={order.productName}>{order.productName}</span>
                        <span className="order-time">added at time: {order.timeString}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom action: Place All Orders */}
              <div className="sidebar-bottom-actions">
                <button
                  type="button"
                  disabled={orders.length === 0 || isOptimizing}
                  className="btn btn-primary btn-block btn-lg"
                  onClick={onPlaceAllOrders}
                >
                  {isOptimizing ? 'Computing Route...' : `Place all orders (${orders.length})`}
                </button>
              </div>
            </>
          )}

          {/* If route is calculated & active */}
          {routeData && (
            <div className="route-results-container">
              {/* Algorithm explanations */}
              <div className="algorithm-explanation-box">
                <div className="algo-header">Routing Computation Applied</div>
                {routeData.algorithmNotes && routeData.algorithmNotes.map((line, idx) => (
                  <p key={idx} className="algo-line">• {line}</p>
                ))}
              </div>

              {/* Held-Karp optimization status if available */}
              {heldKarpResult && (
                <div className={`status-banner ${heldKarpResult.improved ? 'success' : 'info'}`}>
                  {heldKarpResult.message}
                </div>
              )}

              {/* Warehouse & Driver Stats */}
              <div className="delivery-stats-card">
                <div className="stat-row highlight">
                  <span className="stat-label">Warehouse Assigned:</span>
                  <span className="stat-value">Warehouse #{routeData.assignedWarehouse.id}</span>
                </div>

                <div className="stat-row">
                  <span className="stat-icon-label">
                    <FiTruck className="truck-icon" /> average driver speed:
                  </span>
                  <span className="stat-value">50km/h</span>
                </div>

                <div className="stat-row">
                  <span className="stat-label">Total Distance:</span>
                  <span className="stat-value">{routeData.totalDistance} km</span>
                </div>

                <div className="stat-row">
                  <span className="stat-label">Total time until driver comes back to warehouse:</span>
                  <span className="stat-value">approximately {routeData.calTime}</span>
                </div>
              </div>

              {/* Instruction note */}
              <div className="interaction-note">
                <p>Click on an order to determine its delivery details.</p>
              </div>

              {/* Selected Order Detail Card */}
              {selectedOrderDelivery && (
                <div className="selected-order-card">
                  <div className="card-header">
                    <strong>Order #{selectedOrderDelivery.orderId}</strong>
                    <span>{selectedOrderDelivery.productName}</span>
                  </div>
                  <div className="detail-row">
                    <span>Distance from start:</span>
                    <strong>{selectedOrderDelivery.distanceKm} km</strong>
                  </div>
                  <div className="detail-row">
                    <span>Time until delivery:</span>
                    <strong>{selectedOrderDelivery.timeUntilDelivery}</strong>
                  </div>
                </div>
              )}

              {/* Route Orders Sequence list */}
              <div className="list-container">
                <h4 className="list-title">Tour Delivery Sequence ({orders.length})</h4>
                <div className="scrolling-list">
                  {routeData.tour.map((order, idx) => {
                    const isSelected = selectedOrderDelivery && selectedOrderDelivery.orderId === order.id;
                    const orderDetail = routeData.orderDetails ? routeData.orderDetails[order.id] : null;
                    return (
                      <div
                        key={order.id}
                        className={`order-collapsed-line ${isSelected ? 'active' : ''}`}
                        onClick={() => onSelectOrder(order)}
                      >
                        <span className="sequence-number">{idx + 1}.</span>
                        <span className="order-badge">#{order.id}</span>
                        <span className="order-name">{order.productName}</span>
                        {orderDetail && (
                          <span className="order-eta">{orderDetail.timeUntilDelivery}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Lower End Options */}
              <div className="sidebar-bottom-actions">
                {/* Optimise route button (disappears once clicked) */}
                {!heldKarpResult && (
                  <button
                    type="button"
                    disabled={orders.length > 14 || isOptimizing}
                    className="btn btn-secondary btn-block"
                    onClick={onOptimiseHeldKarp}
                    title={orders.length > 14 ? 'Disabled: Orders exceed 14' : 'Run Held-Karp exact optimisation'}
                  >
                    Optimise route (no. of orders should be less than 15)
                  </button>
                )}

                {/* Finish Batch delivery button */}
                <button
                  type="button"
                  className="btn btn-primary btn-block btn-finish"
                  onClick={onFinishBatch}
                >
                  <FiClock /> Finish Batch Delivery
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

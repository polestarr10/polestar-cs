import React from 'react';

export const STATUS_CONFIG = {
  INQUIRY_RECEIVED: {
    label: "Inquiry Received",
    shortLabel: "Received",
    colorClass: "status-pending",
    dotColor: "#FFA08C",
    description: "New inquiry logged, pending quotation"
  },
  UNDER_REVIEW: {
    label: "Under Liner Review",
    shortLabel: "Liner Check",
    colorClass: "status-review",
    dotColor: "#FF8A73",
    description: "Rate requested from shipping line"
  },
  QUOTED_REPLIED: {
    label: "Quoted & Replied",
    shortLabel: "Quoted",
    colorClass: "status-quoted",
    dotColor: "#34d399",
    description: "Quotation sent to customer"
  },
  FOLLOWUP_NEEDED: {
    label: "Follow-up Required",
    shortLabel: "Follow-up",
    colorClass: "status-followup",
    dotColor: "#c084fc",
    description: "Follow-up required with customer"
  },
  BOOKING_WON: {
    label: "Booking Confirmed",
    shortLabel: "Won",
    colorClass: "status-won",
    dotColor: "#10b981",
    description: "Booking confirmed"
  },
  CLOSED_LOST: {
    label: "Closed / Lost",
    shortLabel: "Lost",
    colorClass: "status-lost",
    dotColor: "#f87171",
    description: "Inquiry closed or lost"
  }
};

export default function StatusBadge({ status, onChange, allowChange = true }) {
  const current = STATUS_CONFIG[status] || STATUS_CONFIG.INQUIRY_RECEIVED;

  const handleChange = (e) => {
    e.stopPropagation();
    const newStatus = e.target.value;
    if (onChange && newStatus !== status) {
      onChange(newStatus);
    }
  };

  if (!allowChange) {
    return (
      <span className={`status-pill ${current.colorClass}`}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: current.dotColor }}></span>
        <span>{current.label}</span>
      </span>
    );
  }

  return (
    <div className="relative inline-flex items-center" onClick={(e) => e.stopPropagation()}>
      <select
        value={status || "INQUIRY_RECEIVED"}
        onChange={handleChange}
        onClick={(e) => e.stopPropagation()}
        className={`status-pill ${current.colorClass} cursor-pointer hover:brightness-110 pr-5 appearance-none focus:outline-none`}
        style={{
          backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23FFA08C' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 4px center',
          backgroundSize: '10px'
        }}
        title="Click to change CRM status"
      >
        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
          <option key={key} value={key} className="bg-[#120f0e] text-white py-1 font-semibold">
            {config.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// CostInputCell.jsx
import React, { useEffect, useState } from "react";

export default function CostInputCell({ initialValue, rowId, whatIs, isEditable, onEdit, bold }) {
  const [value, setValue] = useState(initialValue);

  const handleChange = (e) => {
    const newValue = e.target.value;
    if (/^$|^\d*\.?\d{0,3}$/.test(newValue)) {
      setValue(newValue);
      if (onEdit) {
        onEdit(rowId, whatIs, newValue);
      }
    }

  };

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  if (!isEditable) {
    return <span className={`${bold ? "font-semibold" : ""} `}>{initialValue}</span>;
  }

  return (
    <input
      type="text"
      value={value}
      maxLength={10}
      onChange={handleChange}
      className="outline-none font-semibold bg-green-200 tracking-wide px-2 py-[0.4rem] flex-shrink-0 dropdown-container text-black rounded-lg shadow-sm"
    />
  );
}
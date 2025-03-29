// CostInputCell.jsx
import React, { useEffect, useState } from "react";

export default function CostInputCell({ initialValue, rowId, isEditable, onEdit }) {
  const [value, setValue] = useState(initialValue);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setValue(newValue);
    if (onEdit) {
      onEdit(rowId, newValue); // Optional: update parent state
    }
  };

  useEffect(() => {
    setValue(initialValue); // Reset input if initialValue changes from parent
  }, [initialValue]);

  if (!isEditable) {
    return <span className=" font-semibold">{initialValue}</span>;
  }

  return (
    <input
      type="text"
      value={value}
      onChange={handleChange}
      className="outline-none font-semibold border-black border tracking-wide px-2 py-[0.4rem] flex-shrink-0 dropdown-container text-black rounded-lg shadow-sm"
    />
  );
}
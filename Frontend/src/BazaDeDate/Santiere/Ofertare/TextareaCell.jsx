// TextAreaCell.jsx
import React, { useEffect, useState } from "react";

export default function TextAreaCell({
  initialValue,
  rowId,
  whatIs,
  isEditable,
  onEdit,
  bold
}) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setValue(newValue);
    onEdit?.(rowId, whatIs, newValue);
  };

  if (!isEditable) {
    return <span className={bold ? "font-semibold" : ""}>{initialValue}</span>;
  }

  return (
    <textarea
      rows={2}
      value={value}
      maxLength={200}
      onChange={handleChange}
      className="
        outline-none
        border border-black
        rounded-lg
        px-2 
        py-[0.2rem]
        scrollbar-webkit        
        leading-[1.35]
        shadow-sm
        text-black
        resize-none
        overflow-auto
      "
    />
  );
}

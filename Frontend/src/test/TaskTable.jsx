import { useState, useEffect, useMemo } from "react";
import { useReactTable, getCoreRowModel, getPaginationRowModel } from "@tanstack/react-table";
import axios from "axios";
import api from "../api/axiosAPI";

const UsersTable = () => {
  const [articles, setArticles] = useState([]);
  const [page, setPage] = useState(1);
  const limit = 50; // Items per page

  const fetchSomeData = async () => {
    let clicked = 1;
    try {
      let types = ["Category 1", "Category 2", "Category 3", "Category 4"];
      const response = await api.get(`/articles/fetchArticles`, {
            params: { offset:page-1, limit, type:types[clicked-1] },
        });
        console.log(response.data.data);
        setArticles(response.data.data)
    } catch (err) {
        console.error('Error fetching data:', err);
    }
};

  useEffect(() => {
    fetchSomeData();
  }, [page]);

  // Define table columns
  const columns = useMemo(() => [
    { accessorKey: "code", header: "Code" },
    { accessorKey: "name", header: "Name" },
    { accessorKey: "email", header: "Email" },
    { accessorKey: "role", header: "Role" },
  ], []);

  // Initialize table
  const table = useReactTable({
    data: articles,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(), 
  });

  return (
    <div className="p-4 text-white">
      <table className="w-full border-collapse border border-gray-300">
        <thead>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id} className="bg-gray-200">
              {headerGroup.headers.map(header => (
                <th key={header.id} className="border p-2">{header.column.columnDef.header}</th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => (
            <tr key={row.id} className="border">
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="border p-2">{cell.renderValue()}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination Controls */}
      <div className="mt-4 flex justify-between">
        <button
          className="p-2 bg-gray-300 rounded"
          onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
          disabled={page === 1}
        >
          Previous
        </button>
        <span>Page {page}</span>
        <button className="p-2 bg-gray-300 rounded" onClick={() => setPage((prev) => prev + 1)}>
          Next
        </button>
      </div>
    </div>
  );
};

export default UsersTable;

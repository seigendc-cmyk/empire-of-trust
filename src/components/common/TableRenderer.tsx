import React from 'react';
import { TableData } from '../../types';

interface TableRendererProps {
  data?: TableData;
  className?: string;
}

export const TableRenderer: React.FC<TableRendererProps> = ({ data, className = '' }) => {
  if (!data || !data.rows || data.rows.length === 0) {
    return <div className="text-xs text-[#999] italic p-2 border border-dashed rounded">Empty Table</div>;
  }

  const { headers = [], rows = [], hasHeaderRow = true, striped = true, bordered = true } = data;

  return (
    <div className={`overflow-x-auto my-3 ${className}`}>
      <table className={`w-full text-xs text-left border-collapse ${bordered ? 'border border-[#e0e0e0]' : ''}`}>
        {hasHeaderRow && headers.length > 0 && (
          <thead>
            <tr className="bg-[#f0f0f0] border-b border-[#e0e0e0] font-bold text-[#2c2c2c]">
              {headers.map((h, i) => (
                <th key={i} className={`p-2.5 ${bordered ? 'border-r border-[#e0e0e0] last:border-r-0' : ''}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, rIdx) => (
            <tr
              key={rIdx}
              className={`border-b border-[#e0e0e0] last:border-b-0 ${
                striped && rIdx % 2 === 1 ? 'bg-[#f9f9f9]' : 'bg-white'
              }`}
            >
              {row.map((cell, cIdx) => (
                <td
                  key={cIdx}
                  className={`p-2.5 text-[#2c2c2c] ${bordered ? 'border-r border-[#e0e0e0] last:border-r-0' : ''}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

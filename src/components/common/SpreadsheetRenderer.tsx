import React from 'react';
import { SpreadsheetData } from '../../types';
import { Table, Calculator, Plus, Trash2, DollarSign } from 'lucide-react';

interface SpreadsheetRendererProps {
  data: SpreadsheetData;
  isEditing?: boolean;
  onChangeData?: (updated: SpreadsheetData) => void;
}

export const SpreadsheetRenderer: React.FC<SpreadsheetRendererProps> = ({
  data,
  isEditing = false,
  onChangeData,
}) => {
  const currencySymbol = data.currencySymbol || '$';
  const columns = data.columns || [];
  const rows = data.rows || [];

  // Calculate Column Totals for SUM formulas
  const colTotals = columns.map((col) => {
    if (col.formula === 'sum') {
      return rows.reduce((acc, r) => acc + (Number(r[col.id]) || 0), 0);
    }
    if (col.formula === 'avg' && rows.length > 0) {
      const sum = rows.reduce((acc, r) => acc + (Number(r[col.id]) || 0), 0);
      return sum / rows.length;
    }
    if (col.formula === 'count') {
      return rows.length;
    }
    return null;
  });

  const handleUpdateCell = (rowIndex: number, colId: string, val: any) => {
    if (!onChangeData) return;
    const newRows = [...rows];
    const colObj = columns.find((c) => c.id === colId);
    let parsedVal = val;
    if (colObj?.type === 'number' || colObj?.type === 'currency') {
      parsedVal = val === '' ? 0 : Number(val);
    }
    newRows[rowIndex] = { ...newRows[rowIndex], [colId]: parsedVal };
    onChangeData({ ...data, rows: newRows });
  };

  const handleAddRow = () => {
    if (!onChangeData) return;
    const newRowObj: Record<string, any> = {};
    columns.forEach((c, idx) => {
      newRowObj[c.id] = idx === 0 ? 'New Line Item' : 0;
    });
    onChangeData({ ...data, rows: [...rows, newRowObj] });
  };

  const handleRemoveRow = (rIdx: number) => {
    if (!onChangeData) return;
    onChangeData({ ...data, rows: rows.filter((_, idx) => idx !== rIdx) });
  };

  const handleAddColumn = () => {
    if (!onChangeData) return;
    const newColId = 'col_' + Date.now().toString(36).substring(2, 6);
    const newColName = `Col ${columns.length + 1}`;
    const newCols = [...columns, { id: newColId, name: newColName, type: 'currency' as const, formula: 'sum' as const }];
    const newRows = rows.map((r) => ({ ...r, [newColId]: 0 }));
    onChangeData({ ...data, columns: newCols, rows: newRows });
  };

  return (
    <div className="my-4 border border-[#e0e0e0] rounded-xl overflow-hidden bg-white shadow-xs">
      
      {/* Title Header Bar */}
      <div className="bg-[#1e293b] text-white px-4 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-[#ff6321]" />
          {isEditing ? (
            <input
              type="text"
              value={data.title || 'Accounting & Financial Spreadsheet'}
              onChange={(e) => onChangeData && onChangeData({ ...data, title: e.target.value })}
              className="bg-slate-800 text-white font-bold text-xs px-2 py-1 rounded border border-slate-700 focus:outline-none focus:border-[#ff6321]"
              placeholder="Spreadsheet Title..."
            />
          ) : (
            <span className="font-bold text-xs tracking-wide">{data.title || 'Financial Spreadsheet'}</span>
          )}
        </div>

        {isEditing && (
          <div className="flex items-center gap-2 text-xs">
            <label className="flex items-center gap-1 cursor-pointer text-[#e2e8f0]">
              <input
                type="checkbox"
                checked={data.showTotalRow !== false}
                onChange={(e) => onChangeData && onChangeData({ ...data, showTotalRow: e.target.checked })}
                className="rounded text-[#ff6321]"
              />
              Totals Row
            </label>
            <button
              onClick={handleAddColumn}
              className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded font-bold text-[11px] flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3 h-3 text-[#ff6321]" /> Add Column
            </button>
          </div>
        )}
      </div>

      {/* Spreadsheet Grid Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
              {columns.map((col, cIdx) => (
                <th key={col.id} className="p-3 border-r border-slate-200 min-w-[120px]">
                  {isEditing ? (
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={col.name}
                        onChange={(e) => {
                          if (!onChangeData) return;
                          const newCols = [...columns];
                          newCols[cIdx] = { ...newCols[cIdx], name: e.target.value };
                          onChangeData({ ...data, columns: newCols });
                        }}
                        className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 font-bold text-slate-800 text-xs focus:outline-none focus:border-[#ff6321]"
                      />
                      <div className="flex items-center justify-between text-[9px] font-normal text-slate-500">
                        <select
                          value={col.type}
                          onChange={(e) => {
                            if (!onChangeData) return;
                            const newCols = [...columns];
                            newCols[cIdx] = { ...newCols[cIdx], type: e.target.value as any };
                            onChangeData({ ...data, columns: newCols });
                          }}
                          className="bg-transparent"
                        >
                          <option value="text">Text</option>
                          <option value="currency">Currency ($)</option>
                          <option value="number">Number</option>
                        </select>
                        <select
                          value={col.formula || 'none'}
                          onChange={(e) => {
                            if (!onChangeData) return;
                            const newCols = [...columns];
                            newCols[cIdx] = { ...newCols[cIdx], formula: e.target.value as any };
                            onChangeData({ ...data, columns: newCols });
                          }}
                          className="bg-transparent font-semibold text-[#ff6321]"
                        >
                          <option value="none">No Formula</option>
                          <option value="sum">SUM Σ</option>
                          <option value="avg">AVG x̄</option>
                          <option value="count">COUNT N</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span>{col.name}</span>
                      {col.formula && col.formula !== 'none' && (
                        <span className="text-[9px] bg-slate-200 text-slate-600 px-1 rounded uppercase">
                          {col.formula}
                        </span>
                      )}
                    </div>
                  )}
                </th>
              ))}
              {isEditing && <th className="p-2 w-10 text-center">Action</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rIdx) => (
              <tr key={rIdx} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                {columns.map((col) => {
                  const cellVal = row[col.id];
                  return (
                    <td key={col.id} className="p-2.5 border-r border-slate-200 font-mono text-slate-800">
                      {isEditing ? (
                        <input
                          type={col.type === 'number' || col.type === 'currency' ? 'number' : 'text'}
                          value={cellVal !== undefined && cellVal !== null ? cellVal : ''}
                          onChange={(e) => handleUpdateCell(rIdx, col.id, e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-[#ff6321]"
                        />
                      ) : (
                        <span>
                          {col.type === 'currency' && typeof cellVal === 'number'
                            ? `${currencySymbol}${cellVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                            : String(cellVal !== undefined ? cellVal : '')}
                        </span>
                      )}
                    </td>
                  );
                })}
                {isEditing && (
                  <td className="p-2 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(rIdx)}
                      className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                      title="Delete Row"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                )}
              </tr>
            ))}

            {/* Calculated Total Summary Row */}
            {data.showTotalRow !== false && (
              <tr className="bg-amber-50/90 border-t-2 border-amber-300 font-bold text-amber-950 font-mono">
                {columns.map((col, cIdx) => {
                  const totalVal = colTotals[cIdx];
                  if (cIdx === 0) {
                    return (
                      <td key={col.id} className="p-3 border-r border-amber-200 uppercase tracking-wider text-[11px] text-amber-900">
                        Total / Summary
                      </td>
                    );
                  }
                  return (
                    <td key={col.id} className="p-3 border-r border-amber-200">
                      {totalVal !== null && totalVal !== undefined ? (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-amber-700 uppercase">{col.formula}:</span>
                          <span>
                            {col.type === 'currency'
                              ? `${currencySymbol}${totalVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                              : totalVal.toLocaleString('en-US')}
                          </span>
                        </div>
                      ) : (
                        <span className="text-amber-400 font-normal">—</span>
                      )}
                    </td>
                  );
                })}
                {isEditing && <td className="p-2"></td>}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Row Button Footer */}
      {isEditing && (
        <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={handleAddRow}
            className="px-3 py-1.5 bg-[#ff6321] hover:opacity-90 text-white rounded font-bold text-xs flex items-center gap-1 transition-opacity shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Add Row
          </button>
          <span className="text-[11px] text-slate-500 font-mono">
            {rows.length} rows • {columns.length} columns
          </span>
        </div>
      )}

    </div>
  );
};

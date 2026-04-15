import "./DataTable.css";

function resolveRowKey(row, index, rowKey) {
  if (typeof rowKey === "function") return rowKey(row, index);
  if (typeof rowKey === "string") return row?.[rowKey] ?? index;
  return row?.id ?? index;
}

function resolveCellValue(column, row, rowIndex) {
  const hasAccessor =
    typeof column.accessor === "function" ||
    typeof column.accessor === "string";
  const raw =
    typeof column.accessor === "function"
      ? column.accessor(row, rowIndex)
      : typeof column.accessor === "string"
        ? row?.[column.accessor]
        : row?.[column.key];

  if (typeof column.render === "function") {
    // Compatibility mode:
    // - with accessor -> render(value, row, rowIndex)
    // - without accessor -> render(row, rowIndex, value)
    if (hasAccessor) {
      return column.render(raw, row, rowIndex);
    }
    return column.render(row, rowIndex, raw);
  }
  return raw ?? "—";
}

export default function DataTable({
  columns = [],
  data = [],
  rowKey,
  className = "",
  cellClassName = "",
  rowClassName,
  emptyMessage = "Нет данных для отображения",
  sortable = false,
  onSort,
}) {
  const allColumns = Array.isArray(columns) ? columns : [];
  const safeData = Array.isArray(data) ? data : [];

  return (
    <div className={`data-table-container ${className}`}>
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              {allColumns.map((column, index) => (
                <th
                  key={column.key ?? index}
                  scope="col"
                  className={`data-table-th ${column.headerClassName ?? ""} ${
                    column.sortable || sortable ? "sortable" : ""
                  }`}
                  onClick={() =>
                    (column.sortable || sortable) &&
                    typeof onSort === "function" &&
                    onSort(column.key)
                  }
                  style={{
                    ...(column.minWidth ? { minWidth: column.minWidth } : {}),
                    ...(column.width ? { width: column.width } : {}),
                  }}
                >
                  {column.title ?? column.header ?? ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {safeData.length === 0 ? (
              <tr className="data-table-row">
                <td colSpan={Math.max(1, allColumns.length)} style={{ height: 200, padding: 0 }} />
              </tr>
            ) : (
              safeData.map((row, rowIndex) => (
                <tr
                  key={resolveRowKey(row, rowIndex, rowKey)}
                  className={`data-table-row ${
                    typeof rowClassName === "function"
                      ? rowClassName(row, rowIndex)
                      : rowClassName ?? ""
                  }`}
                >
                  {allColumns.map((column, colIndex) => (
                    <td
                      key={column.key ?? colIndex}
                      className={`data-table-td ${cellClassName} ${column.cellClassName ?? ""}`}
                      style={{
                        verticalAlign: column.verticalAlign ?? "middle",
                        ...(column.minWidth ? { minWidth: column.minWidth } : {}),
                        ...(column.width ? { width: column.width } : {}),
                      }}
                    >
                      {resolveCellValue(column, row, rowIndex)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {safeData.length === 0 && (
        <div className="data-table-empty-overlay">
          <div className="data-table-empty-overlay-content">{emptyMessage}</div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useCallback, useMemo, useRef } from 'react';
import { AgGridReact, AgGridReactProps } from 'ag-grid-react';
import {
  ColDef,
  GridReadyEvent,
  ModuleRegistry,
  ClientSideRowModelModule,
} from 'ag-grid-community';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

ModuleRegistry.registerModules([ClientSideRowModelModule]);

export interface AgGridProps<TData = unknown> extends AgGridReactProps<TData> {
  /** 欄位定義 */
  columnDefs: ColDef<TData>[];
  /** 資料列 */
  rowData: TData[];
  /** 容器高度，預設 400px */
  height?: number | string;
  /** AG Grid 主題，預設 ag-theme-alpine */
  theme?: string;
  /** Grid 就緒回呼 */
  onGridReady?: (event: GridReadyEvent<TData>) => void;
}

const AgGrid = <TData = unknown,>({
  columnDefs,
  rowData,
  height = 400,
  theme = 'ag-theme-alpine',
  onGridReady,
  ...rest
}: AgGridProps<TData>) => {
  const gridRef = useRef<AgGridReact<TData>>(null);

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
      flex: 1,
      minWidth: 100,
    }),
    [],
  );

  const handleGridReady = useCallback(
    (event: GridReadyEvent<TData>) => {
      onGridReady?.(event);
    },
    [onGridReady],
  );

  return (
    <div className={theme} style={{ height }}>
      <AgGridReact<TData>
        ref={gridRef}
        rowData={rowData}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        onGridReady={handleGridReady}
        animateRows
        {...rest}
      />
    </div>
  );
};

export default AgGrid;

'use client';

import { Counter, AgGrid } from '@myorg/ui';

export default function Home() {
  return (
    <div>
      <Counter />
      <AgGrid
        columnDefs={[{ field: 'name' }, { field: 'age' }]}
        rowData={[{ name: 'Alice', age: 30 }]}
        height={500}
      />
    </div>
  );
}

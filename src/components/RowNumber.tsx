import { useState } from 'react';

const RowNumber: React.FC = () => {
  const [rowNumber, setRowNumber] = useState(10);

  return (
    <div className="flex items-center justify-between mt-4 text-black px-9">
      <div>
      <span className="mr-2">Rows per page:</span>
      <select
        value={rowNumber}
        onChange={(e) => setRowNumber(Number(e.target.value))}
        className="border rounded p-1"
      >
        <option value={10}>10</option>
        <option value={20}>20</option>
        <option value={50}>50</option>
      </select>
      </div>
      <div className="flex items-center gap-2">
          <span>Showing 1 to 10 of 100</span>
          <div className="flex gap-1">
            <button className="p-1 rounded hover:bg-gray-100">&lt;</button>
            <button className="p-1 rounded hover:bg-gray-100">&gt;</button>
          </div>
        </div>
    </div>
  );
};

export default RowNumber;


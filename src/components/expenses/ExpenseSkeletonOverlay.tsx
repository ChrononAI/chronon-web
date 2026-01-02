import { Skeleton } from '@mui/material';
import { GridOverlay } from '@mui/x-data-grid';

function ExpensesSkeletonOverlay({ rowCount = 8 }) {
  return (
    <GridOverlay>
      <div className="w-full py-3 space-y-0">
        {Array.from({ length: rowCount }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="flex items-center gap-4 w-full py-3 px-2 border-[0.5px] border-gray"
          >
            <Skeleton
              variant="rectangular"
              height={10}
              width="2%"
              className="rounded-full"
            />
            {/* EXPENSE ID */}
            <Skeleton
              variant="rectangular"
              height={10}
              width="10%"
              className="rounded-full"
            />

            {/* TYPE */}
            <Skeleton
              variant="rectangular"
              height={10}
              width="8%"
              className="rounded-full"
            />

            {/* POLICY */}
            <Skeleton
              variant="rectangular"
              height={10}
              width="10%"
              className="rounded-full"
            />

            {/* CATEGORY */}
            <Skeleton
              variant="rectangular"
              height={10}
              width="10%"
              className="rounded-full"
            />

            {/* VENDOR */}
            <Skeleton
              variant="rectangular"
              height={10}
              width="16%"
              className="rounded-full"
            />

            {/* DATE */}
            <Skeleton
              variant="rectangular"
              height={10}
              width="8%"
              className="rounded-full"
            />

            {/* AMOUNT */}
            <Skeleton
              variant="rectangular"
              height={10}
              width="8%"
              className="rounded-full"
            />

            {/* CURRENCY */}
            <Skeleton
              variant="rectangular"
              height={10}
              width="6%"
              className="rounded-full"
            />

            {/* STATUS */}
            <Skeleton
              variant="rectangular"
              height={10}
              width="12%"
              className="rounded-full"
            />
          </div>
        ))}
      </div>
    </GridOverlay>
  );
}

export default ExpensesSkeletonOverlay
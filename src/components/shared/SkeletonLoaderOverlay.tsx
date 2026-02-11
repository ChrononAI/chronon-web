import { Skeleton } from '@mui/material';
import { GridOverlay } from '@mui/x-data-grid';

function SkeletonLoaderOverlay({ rowCount = 8 }) {
  return (
    <GridOverlay>
      <div className="w-full py-0 space-y-0">
        {Array.from({ length: rowCount }).map((_, rowIndex: number) => (
          <div
            key={rowIndex}
            className="flex items-center gap-4 w-full py-3 px-2 border-[0.5px] border-gray"
          >
            <Skeleton
              variant="rectangular"
              height={12}
              width="100%"
              className="rounded-full"
            />
          </div>
        ))}
      </div>
    </GridOverlay>
  );
}

export default SkeletonLoaderOverlay
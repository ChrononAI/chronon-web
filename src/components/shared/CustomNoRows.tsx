import { Box } from "@mui/material";
import { GridOverlay } from "@mui/x-data-grid";
import { CheckCircle } from "lucide-react";

function CustomNoRows({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <GridOverlay>
      <Box className="w-full">
        <div className="text-center">
          <CheckCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {title}
          </h3>
          <p className="text-muted-foreground">
            {description} 
          </p>
        </div>
      </Box>
    </GridOverlay>
  );
}

export default CustomNoRows;

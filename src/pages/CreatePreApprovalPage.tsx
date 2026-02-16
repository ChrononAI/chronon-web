import { useEffect } from "react";
import CreatePreApprovalForm from "@/components/pre-approval/CreatePreApprovalForm";
import { useLayoutStore } from "@/store/layoutStore";

function CreatePreApprovalPage() {
  const setNoPadding = useLayoutStore((s) => s.setNoPadding);

  useEffect(() => {
    setNoPadding(true);
    return () => {
      setNoPadding(false);
    };
  }, [setNoPadding]);

  return <CreatePreApprovalForm />;
}

export default CreatePreApprovalPage;

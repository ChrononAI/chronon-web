import { useEffect } from "react";
import CreateTripBasicForm from "@/components/trip/CreateTripBasicForm";
import { useLayoutStore } from "@/store/layoutStore";

function CreateTripPage() {
  const setNoPadding = useLayoutStore((s) => s.setNoPadding);

  useEffect(() => {
    setNoPadding(true);
    return () => {
      setNoPadding(false);
    };
  }, [setNoPadding]);

  return <CreateTripBasicForm />;
}

export default CreateTripPage;

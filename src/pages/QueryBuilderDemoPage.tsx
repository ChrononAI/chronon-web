import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QueryBuilder, AdvancedQueryBuilder } from "@/components/query-builder";
import { Settings } from "lucide-react";

const QueryBuilderDemoPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-lg p-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Settings className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Policy Builder</h1>
            <p className="text-muted-foreground">
              Create and manage expense approval policies with conditional logic
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="visual" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="visual">Visual Policy Builder</TabsTrigger>
          <TabsTrigger value="advanced">Advanced Text Editor</TabsTrigger>
        </TabsList>

        <TabsContent value="visual" className="mt-6">
          <QueryBuilder />
        </TabsContent>

        <TabsContent value="advanced" className="mt-6">
          <AdvancedQueryBuilder />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default QueryBuilderDemoPage;

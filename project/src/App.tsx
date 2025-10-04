import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import QueryBuilder from './components/QueryBuilder';
import AdvancedQueryBuilder from './components/AdvancedQueryBuilder';
import { Toaster } from '@/components/ui/toaster';

function App() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Query Builder Suite
          </h1>
          <p className="text-muted-foreground">
            Build complex conditional queries with visual tools and autocomplete
          </p>
        </div>

        <Tabs defaultValue="visual" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="visual">Visual Builder</TabsTrigger>
            <TabsTrigger value="advanced">Text Builder</TabsTrigger>
          </TabsList>
          
          <TabsContent value="visual" className="mt-6">
            <QueryBuilder />
          </TabsContent>
          
          <TabsContent value="advanced" className="mt-6">
            <AdvancedQueryBuilder />
          </TabsContent>
        </Tabs>
      </div>
      
      <Toaster />
    </div>
  );
}

export default App;
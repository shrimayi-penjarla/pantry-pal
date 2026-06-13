import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "@/components/AppLayout";
import AuthGuard from "@/components/AuthGuard";
import Home from "./pages/Home.tsx";
import Login from "./pages/Login.tsx";
import Pantry from "./pages/Pantry.tsx";
import Scan from "./pages/Scan.tsx";
import Recipes from "./pages/Recipes.tsx";
import Cookbook from "./pages/Cookbook.tsx";
import ShoppingList from "./pages/ShoppingList.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const guard = (el: React.ReactNode) => <AuthGuard>{el}</AuthGuard>;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/pantry" element={guard(<Pantry />)} />
            <Route path="/scan" element={guard(<Scan />)} />
            <Route path="/recipes" element={guard(<Recipes />)} />
            <Route path="/cookbook" element={guard(<Cookbook />)} />
            <Route path="/shopping" element={guard(<ShoppingList />)} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

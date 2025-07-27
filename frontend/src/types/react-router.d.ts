// Type declarations to fix React 19 compatibility with React Router DOM 7
declare module 'react-router-dom' {
  import * as React from 'react';
  import { ComponentType, ReactElement } from 'react';
  
  export interface RouteProps {
    path?: string;
    index?: boolean;
    element?: ReactElement | null;
    children?: React.ReactNode;
  }
  
  export interface RoutesProps {
    children?: React.ReactNode;
    location?: any;
  }
  
  export interface LinkProps {
    to: string;
    className?: string;
    children?: React.ReactNode;
  }
  
  export interface OutletProps {
    context?: any;
  }
  
  export const Routes: ComponentType<RoutesProps>;
  export const Route: ComponentType<RouteProps>;
  export const Link: ComponentType<LinkProps>;
  export const Outlet: ComponentType<OutletProps>;
  export const BrowserRouter: ComponentType<{ children?: React.ReactNode }>;
  
  export function useParams<T = Record<string, string>>(): T;
  export function useLocation(): any;
}
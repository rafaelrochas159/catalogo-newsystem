declare module 'vaul' {
  import * as React from 'react';

  type PrimitiveProps<T extends keyof JSX.IntrinsicElements> = React.ComponentPropsWithoutRef<T> & {
    children?: React.ReactNode;
  };

  export const Drawer: {
    Root: React.FC<PrimitiveProps<'div'> & { shouldScaleBackground?: boolean; open?: boolean; onOpenChange?: (open: boolean) => void }>;
    Trigger: React.FC<PrimitiveProps<'button'> & { asChild?: boolean }>;
    Portal: React.FC<{ children?: React.ReactNode }>;
    Close: React.FC<PrimitiveProps<'button'> & { asChild?: boolean }>;
    Overlay: React.ForwardRefExoticComponent<PrimitiveProps<'div'> & React.RefAttributes<HTMLDivElement>>;
    Content: React.ForwardRefExoticComponent<PrimitiveProps<'div'> & React.RefAttributes<HTMLDivElement>>;
    Title: React.ForwardRefExoticComponent<PrimitiveProps<'div'> & React.RefAttributes<HTMLDivElement>>;
    Description: React.ForwardRefExoticComponent<PrimitiveProps<'div'> & React.RefAttributes<HTMLDivElement>>;
  };
}

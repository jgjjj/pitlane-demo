import * as React from 'react';
import { Drawer as DrawerPrimitive } from '@base-ui/react/drawer';
import { cn } from '@/lib/utils';

const Drawer = (props: React.ComponentProps<typeof DrawerPrimitive.Root>) => <DrawerPrimitive.Root {...props} />;
Drawer.displayName = 'Drawer';

const DrawerTrigger = DrawerPrimitive.Trigger;
const DrawerPortal = DrawerPrimitive.Portal;
const DrawerClose = DrawerPrimitive.Close;

const DrawerOverlay = React.forwardRef<React.ElementRef<typeof DrawerPrimitive.Backdrop>, React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Backdrop>>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Backdrop ref={ref} className={cn('fixed inset-0 z-50 bg-black/80', className)} {...props} />
));
DrawerOverlay.displayName = DrawerPrimitive.Backdrop.displayName;

const DrawerContent = React.forwardRef<React.ElementRef<typeof DrawerPrimitive.Popup>, React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Popup>>(({ className, children, ...props }, ref) => (
  <DrawerPortal><DrawerOverlay /><DrawerPrimitive.Popup ref={ref} initialFocus={false} finalFocus {...props} className={cn('fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto max-h-[calc(100dvh-6rem)] flex-col overflow-y-auto rounded-t-[10px] border bg-background', className)}><div className="mx-auto mt-4 h-2 w-[100px] shrink-0 rounded-full bg-muted" />{children}</DrawerPrimitive.Popup></DrawerPortal>
));
DrawerContent.displayName = DrawerPrimitive.Popup.displayName;

const DrawerHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn('grid gap-1.5 p-4 text-center sm:text-left', className)} {...props} />;
const DrawerFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn('mt-auto flex flex-col gap-2 p-4', className)} {...props} />;
const DrawerTitle = React.forwardRef<React.ElementRef<typeof DrawerPrimitive.Title>, React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>>(({ className, ...props }, ref) => <DrawerPrimitive.Title ref={ref} className={cn('text-lg font-semibold leading-none tracking-tight', className)} {...props} />);
const DrawerDescription = React.forwardRef<React.ElementRef<typeof DrawerPrimitive.Description>, React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>>(({ className, ...props }, ref) => <DrawerPrimitive.Description ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />);

export { Drawer, DrawerPortal, DrawerOverlay, DrawerTrigger, DrawerClose, DrawerContent, DrawerHeader, DrawerFooter, DrawerTitle, DrawerDescription };

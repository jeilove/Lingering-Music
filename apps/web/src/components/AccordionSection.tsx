'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../lib/utils';

interface AccordionSectionProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  headerRight?: React.ReactNode;
}

export function AccordionSection({ 
  title, 
  description, 
  icon, 
  children, 
  defaultOpen = true,
  className,
  headerRight
}: AccordionSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className={cn("flex flex-col gap-6", className)}>
      <div 
        className="flex items-center justify-between group cursor-pointer select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-4">
          <div className={cn(
            "p-2 rounded-xl transition-all duration-500",
            isOpen ? "bg-primary/20 text-primary scale-110 shadow-lg shadow-primary/10" : "bg-white/5 text-muted-foreground"
          )}>
            {icon}
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-3">
              <h2 className={cn(
                "text-2xl font-black tracking-tight transition-colors duration-300",
                isOpen ? "text-white" : "text-white/60"
              )}>
                {title}
              </h2>
              <div className={cn(
                "transition-transform duration-500",
                isOpen ? "rotate-0" : "-rotate-90"
              )}>
                <ChevronDown className={cn(
                  "w-5 h-5 transition-colors",
                  isOpen ? "text-primary" : "text-white/20"
                )} />
              </div>
            </div>
            {description && (
              <p className={cn(
                "text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500",
                isOpen ? "text-primary/60" : "text-white/20"
              )}>
                {description}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
          {headerRight}
        </div>
      </div>

      <div className={cn(
        "grid transition-all duration-500 ease-in-out",
        isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 pointer-events-none"
      )}>
        <div className="overflow-hidden">
          <div className="pt-2">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

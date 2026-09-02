'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ALL_BRAND_TAB } from '../constants';

type BrandTabsProps = {
  brands: string[];
  selectedBrand: string;
  onBrandChange: (brand: string) => void;
};

function brandLabel(brand: string): string {
  return brand === ALL_BRAND_TAB ? 'ทั้งหมด' : brand;
}

export default function BrandTabs({ brands, selectedBrand, onBrandChange }: BrandTabsProps) {
  const options = [ALL_BRAND_TAB, ...brands];

  return (
    <>
      <div className="md:hidden">
        <Select value={selectedBrand} onValueChange={onBrandChange}>
          <SelectTrigger className="h-10 w-full bg-white shadow-sm">
            <SelectValue placeholder="เลือกยี่ห้อ" />
          </SelectTrigger>
          <SelectContent className="max-h-[min(60vh,20rem)]">
            {options.map((brand) => (
              <SelectItem key={brand} value={brand}>
                {brandLabel(brand)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={selectedBrand} onValueChange={onBrandChange} className="hidden md:block">
        <div className="overflow-x-auto rounded-md border border-slate-200 bg-slate-50/50 p-2 [-webkit-overflow-scrolling:touch]">
          <TabsList className="inline-flex h-auto w-max flex-nowrap items-stretch gap-1 bg-slate-100 p-1">
            <TabsTrigger
              value={ALL_BRAND_TAB}
              className="flex-none shrink-0 px-3 py-2 text-xs font-medium sm:text-sm"
            >
              ทั้งหมด
            </TabsTrigger>
            {brands.map((brand) => (
              <TabsTrigger
                key={brand}
                value={brand}
                className="flex-none shrink-0 px-3 py-2 text-xs sm:text-sm"
                title={brand}
              >
                <span className="block max-w-[220px] truncate sm:max-w-[280px]">{brand}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>
    </>
  );
}

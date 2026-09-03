'use client';

import { useMemo } from 'react';
import SearchableSelect from '@/app/admin/items/components/SearchableSelect';
import { ALL_BRAND_TAB } from '../constants';

type BrandTabsProps = {
  brands: string[];
  selectedBrand: string;
  onBrandChange: (brand: string) => void;
};

export default function BrandTabs({ brands, selectedBrand, onBrandChange }: BrandTabsProps) {
  const options = useMemo(
    () => [
      { value: ALL_BRAND_TAB, label: 'ทั้งหมด' },
      ...brands.map((brand) => ({ value: brand, label: brand })),
    ],
    [brands],
  );

  return (
    <SearchableSelect
      label="ยี่ห้อ"
      placeholder="เลือกยี่ห้อ"
      searchPlaceholder="ค้นหายี่ห้อ..."
      value={selectedBrand}
      onValueChange={onBrandChange}
      options={options}
    />
  );
}

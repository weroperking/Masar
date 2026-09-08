#!/bin/bash
sed -i '/export interface Settings extends BaseRecord {/a \  numericMaxGrade?: number;' src/types.ts
sed -i 's/  totalPrice: number;/  totalPrice?: number;/g' src/types.ts

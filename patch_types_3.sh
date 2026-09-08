#!/bin/bash

# Settings
sed -i '/export interface Settings extends BaseRecord {/a \  freeSessionLimitPerStudent?: number;' src/types.ts

# QrCard
sed -i '/export interface QrCard extends BaseRecord {/a \  linkedAt?: number;' src/types.ts

# User
sed -i 's/  clerkUserId: string;/  clerkUserId?: string;/' src/types.ts

# ProductSale
sed -i '/export interface ProductSale extends BaseRecord {/a \  discountValue?: number;' src/types.ts

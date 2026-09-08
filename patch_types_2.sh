#!/bin/bash

# LedgerEntry
sed -i 's/  paymentMethod: string;/  paymentMethod?: string;/' src/types.ts

# ProductSale
sed -i '/export interface ProductSale extends BaseRecord {/a \  discountType?: string;' src/types.ts

# Settings
sed -i '/export interface Settings extends BaseRecord {/a \  autoCreateAssignmentPerSession?: boolean;' src/types.ts

# QrCard
sed -i '/export interface QrCard extends BaseRecord {/a \  printStatus?: string;' src/types.ts

# User
sed -i '/export interface User extends BaseRecord {/a \  status?: string;' src/types.ts

# BookingRequest
sed -i 's/  studentId: string;/  studentId?: string;/' src/types.ts

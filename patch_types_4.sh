#!/bin/bash

# Settings
sed -i '/export interface Settings extends BaseRecord {/a \  assignmentGradingMethod?: string;' src/types.ts

# QrCard
sed -i 's/  qrCodeData: string;/  qrCodeData?: string;/g' src/types.ts
sed -i 's/  status: '\''active'\'' | '\''revoked'\'';/  status?: '\''active'\'' | '\''revoked'\'' | string;/g' src/types.ts
sed -i 's/  studentId: string;/  studentId?: string;/g' src/types.ts

# ProductSale
sed -i '/export interface ProductSale extends BaseRecord {/a \  subtotal?: number;' src/types.ts
